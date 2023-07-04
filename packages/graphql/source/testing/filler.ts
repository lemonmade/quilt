import {Chance} from 'chance';
import {
  isEnumType,
  isScalarType,
  isObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  FragmentDefinitionNode,
} from 'graphql';
import type {
  DocumentNode,
  SelectionNode,
  GraphQLSchema,
  GraphQLOutputType,
  GraphQLNamedType,
  GraphQLObjectType,
} from 'graphql';

import {
  normalizeOperation,
  getRootType,
  unwrapType,
  getAllObjectTypes,
  getSelectionTypeMap,
  getFirstOperationFromDocument,
} from '../ast.ts';
import type {GraphQLDeepPartialData, GraphQLAnyOperation} from '../types.ts';

import type {GraphQLMockFunction} from './types.ts';

/**
 * The context provided to a function for resolving a default
 * value of a given GraphQL field.
 */
export interface GraphQLFillerResolverContext {
  /**
   * The GraphQL type of the field.
   */
  readonly type: GraphQLOutputType;

  /**
   * The parent object on which this field is being resolved.
   */
  readonly parent: GraphQLObjectType;

  /**
   * The name of the field being resolved.
   */
  readonly field: string;

  /**
   * A `chance` instance that can be used to generate random data.
   * @see https://chancejs.com
   */
  readonly random: Chance.Chance;
}

/**
 * A function that returns GraphQL results for a given GraphQL
 * field.
 */
export type GraphQLFillerResolver = (
  context: GraphQLFillerResolverContext,
) => any;

/**
 * A map of GraphQL type name to a function that provides default
 * values for that type.
 */
export interface GraphQLFillerResolverMap {
  [key: string]: GraphQLFillerResolver;
}

/**
 * The details provided to a function for filling in a GraphQL operation.
 */
export interface GraphQLFillerDetails<Variables> {
  readonly variables: Variables;
}

/**
 * Options for creating a GraphQL operation filler.
 */
export interface GraphQLFillerOptions {
  readonly resolvers?: GraphQLFillerResolverMap;
}

/**
 * Context provided when filling a GraphQL operation.
 */
interface Context {
  /**
   * The GraphQL schema the operation is being run against.
   */
  readonly schema: GraphQLSchema;

  /**
   * A map of resolvers that provide default values for fields in the
   * GraphQL operation.
   */
  readonly resolvers: GraphQLFillerResolverMap;

  /**
   * The parsed document node of the GraphQL query or mutation being performed.
   */
  readonly document: DocumentNode;

  /**
   * A `chance` instance that can be used to generate random data.
   * @see https://chancejs.com
   */
  readonly random: Chance.Chance;
}

const defaultResolvers: GraphQLFillerResolverMap = {
  [GraphQLString.name]: ({random}) => random.word(),
  [GraphQLInt.name]: ({random}) => random.integer(),
  [GraphQLFloat.name]: ({random}) => random.floating({fixed: 2}),
  [GraphQLBoolean.name]: ({random}) => random.bool(),
  [GraphQLID.name]: ({random}) => random.guid(),
};

/**
 * Creates a function that can be used to profile “filled” GraphQL result.
 * The resulting “filler” function takes a GraphQL operation and an (optional)
 * subset of data that should be fixed for that filler, and returns a
 * `GraphQLMock` object that will fill in other required fields with random
 * data.
 *
 * This filler function is ideal for tests, as it allows you to force the parts
 * of the query or mutation you care about to be specific values, while providing
 * random-but-realistic data for the rest of the operation. This function is
 * also type-safe, so you will automatically be informed if you are providing
 * the wrong data, or providing data for fields that are never queried.
 *
 * @param schema - The GraphQL schema that the operation will be run against.
 * @param options - Options for creating the filler function.
 *
 * @example
 * const fillGraphQL = createGraphQLFiller(schema);
 * const mock = fillGraphQL('query { me { name age } }', {me: {name: 'Winston'}});
 * const result = mock.result({variables: {}});
 * // => {me: {name: 'Winston', age: SOME_RANDOM_NUMBER}}
 */
export function createGraphQLFiller(
  schema: GraphQLSchema,
  {resolvers: customResolvers = {}}: GraphQLFillerOptions = {},
) {
  const resolvers = {...defaultResolvers, ...customResolvers};

  /**
   * A function that takes a GraphQL operation and an (optional)
   * subset of data that should be fixed for that filler, and returns a
   * `GraphQLMock` object that will fill in other required fields with random
   * data.
   *
   * This filler function is ideal for tests, as it allows you to force the parts
   * of the query or mutation you care about to be specific values, while providing
   * random-but-realistic data for the rest of the operation. This function is
   * also type-safe, so you will automatically be informed if you are providing
   * the wrong data, or providing data for fields that are never queried.
   *
   * @param operation - The GraphQL query or mutation being run.
   * @param partialData - An optional subset of data that should be fixed for this
   * operation. You can either provide an object that matches any subset of the
   * required data object, or a function that returns such an object.
   */
  return function fillGraphQL<
    Data = Record<string, unknown>,
    Variables = Record<string, unknown>,
  >(
    operation: GraphQLAnyOperation<Data, Variables>,
    partialData?:
      | GraphQLDeepPartialData<Data>
      | ((
          details: GraphQLFillerDetails<Variables>,
        ) => GraphQLDeepPartialData<Data>),
  ): GraphQLMockFunction<Data, Variables> {
    const {document} = normalizeOperation(operation as any);
    const operationNode = getFirstOperationFromDocument(document);

    if (operationNode == null) {
      throw new Error(`No operation found in ${JSON.stringify(operation)}`);
    }

    const result: GraphQLMockFunction<Data, Variables>['result'] = ({
      variables,
    }) => {
      const seed = seedForOperation(operation, variables);
      const random = new Chance(seed);

      const rootType = getRootType(operationNode, schema);
      const partial =
        (typeof partialData === 'function'
          ? partialData({variables: variables ?? ({} as any)})
          : partialData) ?? ({} as any);

      return fillObject(
        partial,
        rootType,
        operationNode.selectionSet.selections,
        {
          random,
          schema,
          resolvers,
          document,
        },
      ) as any;
    };

    return {result, operation};
  };
}

function fillObject(
  partialData: {[key: string]: any},
  objectType: GraphQLObjectType,
  selections: readonly SelectionNode[],
  context: Context,
) {
  const fragmentMap = new Map<string, FragmentDefinitionNode>();
  const typeMap = getSelectionTypeMap(selections, objectType, {
    schema: context.schema,
    resolveFragment(name) {
      const fragment: FragmentDefinitionNode | undefined =
        fragmentMap.get(name) ??
        (context.document.definitions.find(
          (definition) =>
            definition.kind === 'FragmentDefinition' &&
            definition.name.value === name,
        ) as any);

      if (fragment == null) {
        throw new Error(`No fragment found with name ${name}`);
      }

      return fragment;
    },
  });

  const fields = typeMap.get(objectType);

  if (fields == null) {
    return {};
  }

  return [...fields.entries()].reduce<{[key: string]: any}>(
    (resolved, [name, field]) => {
      if (field.name === '__typename') {
        return {...resolved, [name]: objectType.name};
      }

      const unwrappedType = unwrapType(field.type);

      let value: any;

      const fromPartial = partialData[name];

      if (
        unwrappedType.isNonNullable ||
        fromPartial !== undefined ||
        context.random.bool()
      ) {
        if (unwrappedType.isList) {
          if (fromPartial === undefined) {
            value = [];
          } else if (Array.isArray(fromPartial)) {
            // We use Array.from() here so that we can support a sparse array (created
            // with new Array(count)) as a way for the consumer to request a filled array
            // of that size.
            value = Array.from(fromPartial, (arrayValue) => {
              return unwrappedType.isNonNullableListItem ||
                arrayValue !== undefined ||
                context.random.bool()
                ? fillValue(
                    arrayValue,
                    unwrappedType.type,
                    field.selections,
                    context,
                    {
                      field: name,
                      parent: objectType,
                      type: unwrappedType.type,
                      random: context.random,
                    },
                  )
                : null;
            });
          } else {
            throw new Error(
              `Provided non-array value for list field ${name} on type ${
                objectType.name
              } (${JSON.stringify(fromPartial)})`,
            );
          }
        } else {
          value = fillValue(
            fromPartial,
            unwrappedType.type,
            field.selections,
            context,
            {
              field: name,
              parent: objectType,
              type: unwrappedType.type,
              random: context.random,
            },
          );
        }
      } else {
        value = null;
      }

      return {
        ...resolved,
        [name]: value,
      };
    },
    {},
  );
}

function fillValue(
  value: any,
  type: Extract<GraphQLNamedType, GraphQLOutputType>,
  selections: readonly SelectionNode[],
  context: Context,
  resolverContext: GraphQLFillerResolverContext,
) {
  if (isScalarType(type)) {
    return (
      value ??
      context.resolvers[type.name]?.(resolverContext) ??
      context.random.string()
    );
  } else if (isEnumType(type)) {
    return value ?? context.random.pickone([...type.getValues()]).value;
  } else if (isObjectType(type)) {
    return fillObject(
      value ?? context.resolvers[type.name]?.(resolverContext) ?? {},
      type,
      selections,
      context,
    );
  } else {
    const allObjectTypes = getAllObjectTypes(type, context.schema);
    const selectedTypeName: string =
      value?.__typename ??
      context.random.pickone(allObjectTypes as GraphQLObjectType[]).name;

    const matchingObjectType = allObjectTypes.find(
      ({name}) => name === selectedTypeName,
    );

    if (matchingObjectType == null) {
      throw new Error(
        `Can’t find a type with typename ${JSON.stringify(selectedTypeName)}`,
      );
    }

    return fillObject(
      value ?? context.resolvers[selectedTypeName]?.(resolverContext) ?? {},
      matchingObjectType,
      selections,
      context,
    );
  }
}

function seedForOperation<Variables>(
  operation: GraphQLAnyOperation<any, Variables>,
  variables?: Variables,
) {
  let source: string;

  if (typeof operation === 'string') {
    source = operation;
  } else if ('source' in operation) {
    source = operation.source;
  } else {
    source = operation.loc?.source.body ?? JSON.stringify(operation);
  }

  return `${source}${JSON.stringify(variables ?? {})}`;
}

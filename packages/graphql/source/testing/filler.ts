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

export interface GraphQLFillerResolverContext {
  readonly type: GraphQLOutputType;
  readonly parent: GraphQLObjectType;
  readonly field: string;
  readonly random: Chance.Chance;
}

export type GraphQLFillerResolver = (
  details: GraphQLFillerResolverContext,
) => any;

export interface GraphQLFillerResolverMap {
  [key: string]: GraphQLFillerResolver;
}

export interface GraphQLFillerDetails<Variables> {
  readonly variables: Variables;
}

export interface GraphQLFillerOptions {
  resolvers?: GraphQLFillerResolverMap;
}

interface Context {
  readonly random: Chance.Chance;
  readonly schema: GraphQLSchema;
  readonly resolvers: GraphQLFillerResolverMap;
  readonly document: DocumentNode;
}

const defaultResolvers: GraphQLFillerResolverMap = {
  [GraphQLString.name]: ({random}) => random.word(),
  [GraphQLInt.name]: ({random}) => random.integer(),
  [GraphQLFloat.name]: ({random}) => random.floating({fixed: 2}),
  [GraphQLBoolean.name]: ({random}) => random.bool(),
  [GraphQLID.name]: ({random}) => random.guid(),
};

export function createGraphQLFiller(
  schema: GraphQLSchema,
  {resolvers: customResolvers = {}}: GraphQLFillerOptions = {},
) {
  const resolvers = {...defaultResolvers, ...customResolvers};

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

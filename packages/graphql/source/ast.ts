import {
  print,
  parse,
  isNonNullType,
  isListType,
  isUnionType,
  GraphQLString,
  OperationTypeNode,
  isAbstractType,
} from 'graphql';
import type {
  DocumentNode,
  FieldNode,
  SelectionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  GraphQLSchema,
  GraphQLOutputType,
  GraphQLNamedType,
  GraphQLAbstractType,
  GraphQLCompositeType,
  TypedQueryDocumentNode,
  GraphQLObjectType,
  GraphQLInterfaceType,
} from 'graphql';

import type {GraphQLAnyOperation, GraphQLOperation} from './types.ts';

type GraphQLSelectableType = GraphQLObjectType | GraphQLInterfaceType;

export class InvalidSelectionError extends Error {
  constructor(
    readonly type: GraphQLCompositeType,
    readonly field: FieldNode,
  ) {
    super(`Invalid selection: ${field.name.value} on type ${type.name}`);
  }
}

export function getRootType(
  operation: OperationDefinitionNode,
  schema: GraphQLSchema,
) {
  switch (operation.operation) {
    case OperationTypeNode.QUERY:
      return schema.getQueryType()!;
    case OperationTypeNode.MUTATION:
      return schema.getMutationType()!;
    case OperationTypeNode.SUBSCRIPTION:
      return schema.getSubscriptionType()!;
  }
}

export function getAllObjectTypes(
  type: GraphQLAbstractType,
  schema: GraphQLSchema,
) {
  return isUnionType(type)
    ? type.getTypes()
    : schema.getImplementations(type).objects;
}

export function unwrapType(type: GraphQLOutputType): {
  type: Extract<GraphQLOutputType, GraphQLNamedType>;
  isNonNullable: boolean;
  isList: boolean;
  isNonNullableListItem: boolean;
} {
  let isNonNullable = false;
  let isList = false;
  let isNonNullableListItem = false;
  let finalType = type;

  if (isNonNullType(finalType)) {
    isNonNullable = true;
    finalType = finalType.ofType;
  }

  if (isListType(finalType)) {
    isList = true;
    finalType = finalType.ofType;
  }

  if (isNonNullType(finalType)) {
    isNonNullableListItem = true;
    finalType = finalType.ofType;
  }

  return {
    isNonNullable,
    isList,
    isNonNullableListItem,
    type: finalType as any,
  };
}

interface Context {
  schema: GraphQLSchema;
  resolveFragment(name: string): FragmentDefinitionNode;
}

export interface Field {
  name: string;
  type: GraphQLOutputType;
  selections: SelectionNode[];
}

export function getSelectionTypeMap(
  selections: readonly SelectionNode[],
  type: GraphQLCompositeType,
  context: Context,
): Map<GraphQLSelectableType, Map<string, Field>> {
  const typeMap = new Map<
    GraphQLInterfaceType | GraphQLObjectType,
    Map<string, Field>
  >();
  const previouslyAppliedAbstractSelections = new Map<
    GraphQLObjectType,
    Set<SelectionNode>
  >();

  const typeFields = 'getFields' in type ? type.getFields() : {};

  const handleSelection = (
    selection: SelectionNode,
    typeCondition?: GraphQLSelectableType,
    isApplyingInterfaceSelection = false,
  ) => {
    switch (selection.kind) {
      case 'Field': {
        const resolvedType = (typeCondition ?? type) as GraphQLSelectableType;

        // Add this field to each concrete type matching the abstract type. We will
        // also list out the fields for the abstract type itself, so consumers can
        // determine additional fields that were queried only on non-concrete types.
        if (isAbstractType(resolvedType)) {
          for (const objectType of getAllObjectTypes(
            resolvedType,
            context.schema,
          )) {
            const selections =
              previouslyAppliedAbstractSelections.get(objectType) ?? new Set();
            selections.add(selection);
            previouslyAppliedAbstractSelections.set(objectType, selections);

            handleSelection(selection, objectType, true);
          }
        } else if (!isApplyingInterfaceSelection) {
          // Otherwise, if this is an object type, apply any previously-recorded
          // interface selections that apply to this type.
          const selections =
            previouslyAppliedAbstractSelections.get(resolvedType);

          if (selections) {
            for (const selection of selections) {
              handleSelection(selection, resolvedType, true);
            }
          }
        }

        const typeConditionFields =
          typeCondition && 'getFields' in typeCondition
            ? typeCondition.getFields()
            : undefined;

        const name = selection.name.value;
        const aliasOrName = selection.alias?.value ?? name;

        let fieldType: GraphQLOutputType;

        if (name === '__typename') {
          fieldType = GraphQLString;
        } else {
          const typeField = typeConditionFields?.[name] ?? typeFields[name];

          if (typeField == null) {
            throw new InvalidSelectionError(type, selection);
          }

          fieldType = typeField.type;
        }

        const fieldMap = typeMap.get(resolvedType) ?? new Map();
        typeMap.set(resolvedType, fieldMap);

        const existingField: Field = fieldMap.get(aliasOrName) ?? {
          name,
          type: fieldType,
          selections: [],
        };

        if (selection.selectionSet) {
          existingField.selections.push(...selection.selectionSet.selections);
        }

        fieldMap.set(aliasOrName, existingField);

        break;
      }
      case 'FragmentSpread': {
        const {typeCondition: typeConditionNode, selectionSet} =
          context.resolveFragment(selection.name.value);

        const typeCondition =
          (context.schema.getType(
            typeConditionNode.name.value,
          ) as GraphQLSelectableType) ?? undefined;

        for (const selection of selectionSet.selections) {
          handleSelection(selection, typeCondition);
        }

        break;
      }
      case 'InlineFragment': {
        const {typeCondition: typeConditionNode, selectionSet} = selection;

        const typeCondition = typeConditionNode
          ? (context.schema.getType(
              typeConditionNode.name.value,
            ) as GraphQLSelectableType) ?? undefined
          : undefined;

        for (const selection of selectionSet.selections) {
          handleSelection(selection, typeCondition);
        }

        break;
      }
    }
  };

  for (const selection of selections) {
    handleSelection(selection);
  }

  return typeMap;
}

export function normalizeOperation<Data = unknown, Variables = unknown>(
  operation: GraphQLAnyOperation<Data, Variables>,
): GraphQLOperation<Data, Variables> & {
  document: TypedQueryDocumentNode<Data, Variables>;
} {
  if (typeof operation === 'string') {
    const document = parse(operation) as any;
    const firstOperation = getFirstOperationFromDocument(document);

    return {
      id: operation,
      source: operation,
      type: firstOperation?.operation,
      name: firstOperation?.name?.value,
      document,
    };
  } else if ('source' in operation) {
    const document = parse(operation.source) as any;
    const firstOperation = getFirstOperationFromDocument(document);

    return {
      ...operation,
      document,
      type: operation.type ?? firstOperation?.operation,
      name: operation.name ?? firstOperation?.name?.value,
    };
  } else {
    const firstOperation = getFirstOperationFromDocument(operation);
    const source = operation.loc?.source.body ?? print(operation);

    return {
      id: source,
      source,
      document: operation,
      type: firstOperation?.operation,
      name: firstOperation?.name?.value,
    };
  }
}

export function getFirstOperationFromDocument(document: DocumentNode) {
  return document.definitions.find(
    (definition) => definition.kind === 'OperationDefinition',
  ) as OperationDefinitionNode | undefined;
}

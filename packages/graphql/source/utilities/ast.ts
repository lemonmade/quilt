import {
  parse,
  isNonNullType,
  isListType,
  isUnionType,
  GraphQLString,
  OperationTypeNode,
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
} from 'graphql';
import type {GraphQLOperation} from '../types.ts';

export class InvalidSelectionError extends Error {
  constructor(readonly type: GraphQLCompositeType, readonly field: FieldNode) {
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
): Map<GraphQLCompositeType, Map<string, Field>> {
  const typeMap = new Map<GraphQLCompositeType, Map<string, Field>>();

  const typeFields = 'getFields' in type ? type.getFields() : {};

  const handleSelection = (
    selection: SelectionNode,
    typeCondition?: GraphQLCompositeType,
  ) => {
    switch (selection.kind) {
      case 'Field': {
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
          if (typeConditionFields) {
            const typeConditionField = typeConditionFields[name];

            if (typeConditionField == null) {
              throw new InvalidSelectionError(type, selection);
            }

            fieldType = typeConditionField.type;
          } else {
            const typeField = typeFields[name];

            if (typeField == null) {
              throw new InvalidSelectionError(type, selection);
            }

            fieldType = typeField.type;
          }

          fieldType = typeConditionFields
            ? typeConditionFields[name]!.type
            : typeFields[name]!.type;
        }

        const resolvedType = typeCondition ?? type;

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
          ) as GraphQLCompositeType) ?? undefined;

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
            ) as GraphQLCompositeType) ?? undefined
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

export function normalizeOperation(
  operation: string | GraphQLOperation<any, any> | DocumentNode,
) {
  if (typeof operation === 'string') {
    const document = parse(operation);
    return {document, name: getFirstOperationNameFromDocument(document)};
  } else if ('source' in operation) {
    const document = parse(operation.source);
    return {
      document,
      name: operation.name ?? getFirstOperationNameFromDocument(document),
    };
  } else {
    return {
      document: operation,
      name: getFirstOperationNameFromDocument(operation),
    };
  }
}

export function getFirstOperationFromDocument(document: DocumentNode) {
  return document.definitions.find(
    (definition) => definition.kind === 'OperationDefinition',
  ) as OperationDefinitionNode | undefined;
}

function getFirstOperationNameFromDocument(document: DocumentNode) {
  const operation = getFirstOperationFromDocument(document);

  if (operation?.name?.value == null) {
    throw new Error(
      `No named operation found in document ${
        document.loc?.source.body ?? JSON.stringify(document, null, 2)
      }`,
    );
  }

  return operation.name.value;
}

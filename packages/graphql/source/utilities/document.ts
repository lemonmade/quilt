// Adapted from https://github.com/Shopify/graphql-tools-web/blob/main/packages/graphql-mini-transforms/source/document.ts

import {createHash} from 'crypto';
import {print, parse, isCompositeType, isAbstractType} from 'graphql';
import type {
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLSchema,
  DocumentNode,
  OperationDefinitionNode,
  DefinitionNode,
  ExecutableDefinitionNode,
  SelectionSetNode,
  SelectionNode,
} from 'graphql';

type TypenameStrategy = 'always' | 'smart';

export interface TypenameOptions {
  schema: GraphQLSchema;
  clone?: boolean;
  strategy?: TypenameStrategy;
}

const DEFAULT_NAME = 'Operation';

export function minify(originalDocument: DocumentNode, {clone = true} = {}) {
  const document = clone ? parse(print(originalDocument)) : originalDocument;
  removeUnusedDefinitions(document);
  return document;
}

export function toSimpleDocument(document: DocumentNode) {
  const source = minifySource(print(document));
  return {
    source,
    name: operationNameForDocument(document),
    id: createHash('sha256').update(source).digest('hex'),
  };
}

export function addTypename(
  originalDocument: DocumentNode,
  {clone = true, schema, strategy}: TypenameOptions,
) {
  const document = clone ? parse(print(originalDocument)) : originalDocument;

  for (const definition of document.definitions) {
    addTypenameToDefinition(definition, {schema, strategy});
  }

  return document;
}

export function operationNameForDocument(document: DocumentNode) {
  return document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === 'OperationDefinition',
  )?.name?.value;
}

function removeUnusedDefinitions(document: DocumentNode) {
  const usedDefinitions = new Set<DefinitionNode>();
  const dependencies = definitionDependencies(document.definitions);

  const markAsUsed = (definition: DefinitionNode) => {
    if (usedDefinitions.has(definition)) {
      return;
    }

    usedDefinitions.add(definition);

    for (const dependency of dependencies.get(definition) || []) {
      markAsUsed(dependency);
    }
  };

  for (const definition of document.definitions) {
    if (definition.kind !== 'FragmentDefinition') {
      markAsUsed(definition);
    }
  }

  (document as any).definitions = [...usedDefinitions];
}

function definitionDependencies(definitions: readonly DefinitionNode[]) {
  const executableDefinitions: ExecutableDefinitionNode[] = definitions.filter(
    (definition) =>
      definition.kind === 'OperationDefinition' ||
      definition.kind === 'FragmentDefinition',
  ) as any[];

  const definitionsByName = new Map(
    executableDefinitions.map<[string, DefinitionNode]>((definition) => [
      definition.name ? definition.name.value : DEFAULT_NAME,
      definition,
    ]),
  );

  return new Map(
    executableDefinitions.map<[DefinitionNode, DefinitionNode[]]>(
      (executableNode) => [
        executableNode,
        [...collectUsedFragmentSpreads(executableNode, new Set())].map(
          (usedFragment) => {
            const definition = definitionsByName.get(usedFragment);

            if (definition == null) {
              throw new Error(
                `You attempted to use the fragment '${usedFragment}' (in '${
                  executableNode.name ? executableNode.name.value : DEFAULT_NAME
                }'), but it does not exist. Maybe you forgot to import it from another document?`,
              );
            }

            return definition;
          },
        ),
      ],
    ),
  );
}

function minifySource(source: string) {
  return source
    .replace(/#.*/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s\s+/g, ' ')
    .replace(/\s*({|}|\(|\)|\.|:|,)\s*/g, '$1');
}

const TYPENAME_FIELD = {
  kind: 'Field',
  alias: null,
  name: {kind: 'Name', value: '__typename'},
};

function addTypenameToDefinition(
  definition: DefinitionNode,
  {schema, strategy = 'smart'}: Pick<TypenameOptions, 'schema' | 'strategy'>,
) {
  for (const {type, onType, selections} of rootSelectionsByTypeForDefinition(
    definition,
    schema,
  )) {
    const hasTypename = selections.some(
      (selection) =>
        selection.kind === 'Field' && selection.name.value === '__typename',
    );

    const shouldAddTypename =
      !hasTypename &&
      (strategy === 'always' || isAbstractType(type) || isAbstractType(onType));

    if (shouldAddTypename) {
      (selections as any[]).push(TYPENAME_FIELD);
    }
  }
}

function collectUsedFragmentSpreads(
  definition: DefinitionNode,
  usedSpreads: Set<string>,
) {
  for (const selection of selectionsForDefinition(definition)) {
    if (selection.kind === 'FragmentSpread') {
      usedSpreads.add(selection.name.value);
    }
  }

  return usedSpreads;
}

function selectionsForDefinition(
  definition: DefinitionNode,
): IterableIterator<SelectionNode> {
  if (!('selectionSet' in definition) || definition.selectionSet == null) {
    return [][Symbol.iterator]();
  }

  return selectionsForSelectionSet(definition.selectionSet);
}

function* selectionsForSelectionSet({
  selections,
}: SelectionSetNode): IterableIterator<SelectionNode> {
  for (const selection of selections) {
    yield selection;

    if ('selectionSet' in selection && selection.selectionSet != null) {
      yield* selectionsForSelectionSet(selection.selectionSet);
    }
  }
}

function* rootSelectionsByTypeForDefinition(
  definition: DefinitionNode,
  schema: GraphQLSchema,
) {
  if (!('selectionSet' in definition)) {
    return [][Symbol.iterator]();
  }

  let type: GraphQLObjectType | GraphQLInterfaceType;

  switch (definition.kind) {
    case 'OperationDefinition': {
      switch (definition.operation) {
        case 'query': {
          type = schema.getQueryType()!;
          break;
        }
        case 'mutation': {
          type = schema.getMutationType()!;
          break;
        }
        case 'subscription': {
          type = schema.getSubscriptionType()!;
          break;
        }
        default: {
          throw new Error(`Unknown operation type: ${definition.operation}`);
        }
      }

      if (type == null) {
        throw new Error(
          `Could not find a type for operation '${definition.operation}'.`,
        );
      }

      break;
    }
    case 'FragmentDefinition': {
      type = schema.getType(definition.typeCondition.name.value) as
        | GraphQLObjectType
        | GraphQLInterfaceType;

      if (type == null) {
        throw new Error(
          `Could not find a '${definition.typeCondition.name.value}' for fragment '${definition.name.value}'.`,
        );
      }

      break;
    }
  }

  for (const selection of definition.selectionSet.selections) {
    yield* rootSelectionsByTypeForSelection(selection, type!, schema);
  }
}

function* rootSelectionsByTypeForSelection(
  selection: SelectionNode,
  onType: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
  schema: GraphQLSchema,
): IterableIterator<{
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType;
  onType: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType;
  selections: readonly SelectionNode[];
}> {
  if (!('selectionSet' in selection) || selection.selectionSet == null) return;

  const selections = selection.selectionSet?.selections;

  if (selections == null) return;

  let fields: ReturnType<GraphQLObjectType['getFields']>;

  for (const selection of selections) {
    if (selection.kind === 'Field') {
      if (selection.selectionSet == null) {
        continue;
      }

      fields ??= (onType as GraphQLObjectType).getFields();

      const {selections} = selection.selectionSet;

      const field = fields[selection.name.value];

      if (field == null) {
        throw new Error(
          `Can’t query field '${selection.name.value}' on type '${onType.name}'`,
        );
      }

      const {type} = field;

      if (!isCompositeType(type)) continue;

      yield {type: type as any, onType, selections};

      for (const selection of selections) {
        yield* rootSelectionsByTypeForSelection(selection, type as any, schema);
      }
    } else if (selection.kind === 'InlineFragment') {
      const type = selection.typeCondition
        ? schema.getType(selection.typeCondition.name.value)
        : onType;

      if (type == null) {
        throw new Error(
          `Could not find type '${
            selection.typeCondition!.name.value
          }' for inline fragment.`,
        );
      }

      for (const nestedSelection of selection.selectionSet.selections) {
        yield* rootSelectionsByTypeForSelection(
          nestedSelection,
          type as any,
          schema,
        );
      }
    }
  }
}

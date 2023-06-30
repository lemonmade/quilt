// Adapted from https://github.com/Shopify/graphql-tools-web/blob/main/packages/graphql-mini-transforms/source/document.ts

import {createHash} from 'crypto';
import {print, parse} from 'graphql';
import type {
  DocumentNode,
  OperationDefinitionNode,
  DefinitionNode,
  ExecutableDefinitionNode,
  SelectionSetNode,
  SelectionNode,
} from 'graphql';

import {minifyGraphQLSource} from './minify.ts';

const DEFAULT_NAME = 'Operation';

export function addTypename(
  originalDocument: DocumentNode,
  {clone = true} = {},
) {
  const document = clone ? parse(print(originalDocument)) : originalDocument;

  for (const definition of document.definitions) {
    addTypenameToDefinition(definition);
  }

  return document;
}

export function minify(originalDocument: DocumentNode, {clone = true} = {}) {
  const document = clone ? parse(print(originalDocument)) : originalDocument;
  removeUnusedDefinitions(document);
  return document;
}

export function toSimpleDocument(document: DocumentNode) {
  const source = minifyGraphQLSource(print(document));
  return {
    source,
    name: operationNameForDocument(document),
    id: createHash('sha256').update(source).digest('hex'),
  };
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

const TYPENAME_FIELD = {
  kind: 'Field',
  alias: null,
  name: {kind: 'Name', value: '__typename'},
};

function addTypenameToDefinition(definition: DefinitionNode) {
  for (const {selections} of selectionSetsForDefinition(definition)) {
    const hasTypename = selections.some(
      (selection) =>
        selection.kind === 'Field' && selection.name.value === '__typename',
    );

    if (!hasTypename) {
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

function* selectionSetsForDefinition(
  definition: DefinitionNode,
): IterableIterator<SelectionSetNode> {
  if (!('selectionSet' in definition) || definition.selectionSet == null) {
    return [][Symbol.iterator]();
  }

  if (definition.kind !== 'OperationDefinition') {
    yield definition.selectionSet;
  }

  for (const nestedSelection of selectionsForDefinition(definition)) {
    if (
      'selectionSet' in nestedSelection &&
      nestedSelection.selectionSet != null
    ) {
      yield nestedSelection.selectionSet;
    }
  }
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

import {relative} from 'path';
import * as t from '@babel/types';
import type {Statement, TSType, TSTypeElement} from '@babel/types';
import {
  isNonNullType,
  isListType,
  isObjectType,
  isScalarType,
  GraphQLOutputType,
  isUnionType,
  GraphQLCompositeType,
  GraphQLSchema,
  GraphQLNamedType,
  isCompositeType,
  GraphQLLeafType,
} from 'graphql';
import type {
  GraphQLObjectType,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  SelectionNode,
} from 'graphql';
import generate from '@babel/generator';

import type {DocumentDetails, ProjectDetails} from '../types';

import {scalarTypeMap} from './utilities';

interface Options {
  importPath(type: GraphQLLeafType): string;
}

interface Field {
  name: string;
  type: GraphQLOutputType;
  selections: SelectionNode[];
}

interface Context {
  readonly schema: GraphQLSchema;
  readonly rootType: GraphQLObjectType;
  import(type: GraphQLLeafType): TSType;
  resolveFragment(name: string): FragmentDefinitionNode;
}

export function generateDocumentTypes(
  {path, document, dependencies}: DocumentDetails,
  project: ProjectDetails,
  {importPath}: Options,
) {
  const operations: OperationDefinitionNode[] = [];
  const fragments: FragmentDefinitionNode[] = [];

  for (const definition of document.definitions) {
    switch (definition.kind) {
      case 'FragmentDefinition': {
        fragments.push(definition);
        break;
      }
      case 'OperationDefinition': {
        operations.push(definition);
        break;
      }
    }
  }

  if (operations.length > 1) {
    throw new Error(
      `Can’t generate types for a GraphQL file with multiple operations (found: ${operations.map(
        (operation) =>
          operation.name?.value ?? `Unnamed ${operation.operation}`,
      )}) (in ${relative(process.cwd(), path)})`,
    );
  }

  const fileBody: Statement[] = [];

  if (operations.length > 0) {
    const [operation] = operations;

    const rootType = project.schema.getQueryType()!;

    const importMap = new Map<string, Set<GraphQLLeafType>>();
    const importCache = new Set<GraphQLLeafType>();
    const fragmentCache = new Map<string, FragmentDefinitionNode>();

    const context: Context = {
      schema: project.schema,
      rootType,
      import(type) {
        if (!importCache.has(type)) {
          const path = importPath(type);
          const currentImports = importMap.get(path) ?? new Set();
          importMap.set(path, currentImports);
          currentImports.add(type);
          importCache.add(type);
        }

        return t.tsTypeReference(t.identifier(schemaImportName(type)));
      },
      resolveFragment(name) {
        const cachedFragment = fragmentCache.get(name);

        if (cachedFragment) return cachedFragment;

        const inFileFragment = fragments.find(
          (fragment) => fragment.name.value === name,
        );

        if (inFileFragment) {
          fragmentCache.set(name, inFileFragment);
          return inFileFragment;
        }

        for (const dependency of dependencies) {
          const dependencyFragment:
            | FragmentDefinitionNode
            | undefined = project.documents
            .get(dependency)
            ?.document?.definitions.find(
              (definition) =>
                definition.kind === 'FragmentDefinition' &&
                definition.name.value === name,
            ) as any;

          if (dependencyFragment) {
            fragmentCache.set(name, dependencyFragment);
            return dependencyFragment;
          }
        }

        throw new Error(`No fragment found with name ${JSON.stringify(name)}`);
      },
    };

    const name = operation.name?.value ?? 'Unnamed';
    const normalizedName = toTypeName(name);
    const typeName = `${normalizedName}${toTypeName(operation.operation)}Data`;

    const operationTypeImport = t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier('GraphQLOperation'),
          t.identifier('GraphQLOperation'),
        ),
      ],
      t.stringLiteral('@quilted/graphql'),
    );

    operationTypeImport.importKind = 'type';

    const operationExportIdentifier = t.identifier('document');
    operationExportIdentifier.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(
        t.identifier('GraphQLOperation'),
        t.tsTypeParameterInstantiation([
          t.tsTypeReference(t.identifier(typeName)),
        ]),
      ),
    );

    const operationVariableDeclaration = t.variableDeclaration('const', [
      t.variableDeclarator(operationExportIdentifier),
    ]);

    operationVariableDeclaration.declare = true;

    const operationExport = t.exportDefaultDeclaration(
      t.identifier('document'),
    );

    const queryExports = exportsForSelection(
      typeName,
      getSelectionTypeMatch(
        operation.selectionSet.selections,
        rootType,
        context,
      ).get(rootType) ?? new Map(),
      rootType,
      context,
    );

    const schemaImports = [...importMap].map(([source, imported]) =>
      t.importDeclaration(
        [...imported].map((typeImport) =>
          t.importSpecifier(
            t.identifier(schemaImportName(typeImport)),
            t.identifier(typeImport.name),
          ),
        ),
        t.stringLiteral(source),
      ),
    );

    fileBody.push(
      operationTypeImport,
      ...schemaImports,
      ...queryExports,
      operationVariableDeclaration,
      operationExport,
    );
  }

  return generate(t.file(t.program(fileBody), [], [])).code;
}

function exportsForSelection(
  name: string,
  fieldMap: Map<string, Field>,
  type: GraphQLObjectType,
  context: Context,
) {
  const interfaceBody: TSTypeElement[] = [];
  const namespaceBody: Statement[] = [];

  if (type !== context.rootType) {
    interfaceBody.push(
      t.tsPropertySignature(
        t.identifier('__typename'),
        t.tsTypeAnnotation(
          t.tsUnionType([t.tsLiteralType(t.stringLiteral(type.name))]),
        ),
      ),
    );
  }

  for (const [fieldNameOrAlias, fieldDetails] of fieldMap) {
    const nestedTypeName = toTypeName(fieldNameOrAlias);

    const {type: fieldType, selections} = fieldDetails;
    const unwrappedType = unwrapType(fieldType);

    let typescriptType: TSType;

    if (isScalarType(unwrappedType.type)) {
      if (unwrappedType.type.name in scalarTypeMap) {
        typescriptType = scalarTypeMap[unwrappedType.type.name];
      } else {
        typescriptType = context.import(unwrappedType.type);
      }
    } else if (isObjectType(unwrappedType.type)) {
      typescriptType = t.tsTypeReference(
        t.tsQualifiedName(t.identifier(name), t.identifier(nestedTypeName)),
      );

      namespaceBody.push(
        ...exportsForSelection(
          nestedTypeName,
          getSelectionTypeMatch(selections, unwrappedType.type, context).get(
            unwrappedType.type,
          ) ?? new Map(),
          unwrappedType.type,
          context,
        ),
      );
    } else if (isCompositeType(unwrappedType.type)) {
      typescriptType = t.tsTypeReference(
        t.tsQualifiedName(t.identifier(name), t.identifier(nestedTypeName)),
      );

      const allTypes = isUnionType(unwrappedType.type)
        ? unwrappedType.type.getTypes()
        : context.schema.getImplementations(unwrappedType.type).objects;

      const typeMap = getSelectionTypeMatch(
        selections,
        unwrappedType.type,
        context,
      );

      const {
        matched: matchedTypes,
        unmatched: unmatchedTypes,
      } = allTypes.reduce<{
        matched: GraphQLObjectType[];
        unmatched: GraphQLObjectType[];
      }>(
        (all, type) => {
          if (typeMap.has(type)) {
            all.matched.push(type);
          } else {
            all.unmatched.push(type);
          }

          return all;
        },
        {matched: [], unmatched: []},
      );

      for (const matchedType of matchedTypes) {
        const fieldMap = typeMap.get(matchedType)!;

        namespaceBody.push(
          ...exportsForSelection(
            toUnionOrInterfaceTypeName(nestedTypeName, matchedType),
            fieldMap,
            matchedType,
            context,
          ),
        );
      }

      namespaceBody.push(
        t.exportNamedDeclaration(
          t.tsInterfaceDeclaration(
            t.identifier(toUnionOrInterfaceTypeName(nestedTypeName)),
            null,
            null,
            t.tsInterfaceBody([
              t.tsPropertySignature(
                t.identifier('__typename'),
                t.tsTypeAnnotation(
                  t.tsUnionType([
                    ...unmatchedTypes.map((unmatchedType) =>
                      t.tsLiteralType(t.stringLiteral(unmatchedType.name)),
                    ),
                    t.tsLiteralType(t.stringLiteral('')),
                  ]),
                ),
              ),
            ]),
          ),
        ),
      );

      namespaceBody.push(
        t.exportNamedDeclaration(
          t.tsTypeAliasDeclaration(
            t.identifier(nestedTypeName),
            null,
            t.tsUnionType([
              ...matchedTypes.map((matchedType) =>
                t.tsTypeReference(
                  t.identifier(
                    toUnionOrInterfaceTypeName(nestedTypeName, matchedType),
                  ),
                ),
              ),
              t.tsTypeReference(
                t.identifier(toUnionOrInterfaceTypeName(nestedTypeName)),
              ),
            ]),
          ),
        ),
      );
    } else {
      typescriptType = t.tsAnyKeyword();
    }

    const maybeListTypescriptType = unwrappedType.isList
      ? t.tsArrayType(
          unwrappedType.isNonNullableListItem
            ? typescriptType
            : t.tsUnionType([typescriptType, t.tsNullKeyword()]),
        )
      : typescriptType;

    const interfaceProperty = t.tsPropertySignature(
      t.identifier(fieldNameOrAlias),
      t.tsTypeAnnotation(
        unwrappedType.isNonNullable
          ? maybeListTypescriptType
          : t.tsUnionType([maybeListTypescriptType, t.tsNullKeyword()]),
      ),
    );

    interfaceBody.push(interfaceProperty);
  }

  const exported = [
    t.exportNamedDeclaration(
      t.tsInterfaceDeclaration(
        t.identifier(name),
        null,
        null,
        t.tsInterfaceBody(interfaceBody),
      ),
    ),
  ];

  if (namespaceBody.length > 0) {
    exported.push(
      t.exportNamedDeclaration(
        t.tsModuleDeclaration(
          t.identifier(name),
          t.tsModuleBlock(namespaceBody),
        ),
      ),
    );
  }

  return exported;
}

const OTHER_TYPE_NAME = 'Other';

function toUnionOrInterfaceTypeName(
  rootName: string,
  type?: GraphQLObjectType,
) {
  return `${rootName}_${toTypeName(type?.name ?? OTHER_TYPE_NAME)}`;
}

function toTypeName(name: string) {
  return `${name[0].toLocaleUpperCase()}${name.substring(1)}`;
}

function getSelectionTypeMatch(
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

        const fieldType = typeConditionFields
          ? typeConditionFields[name].type
          : typeFields[name].type;
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
        const {
          typeCondition: typeConditionNode,
          selectionSet,
        } = context.resolveFragment(selection.name.value);

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

function schemaImportName({name}: GraphQLLeafType) {
  return `Schema${name}`;
}

function unwrapType(
  type: GraphQLOutputType,
): {
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

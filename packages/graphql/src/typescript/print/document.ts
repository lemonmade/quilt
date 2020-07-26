import {relative} from 'path';
import * as t from '@babel/types';
import type {Statement, TSType, TSTypeElement} from '@babel/types';
import {
  isObjectType,
  isScalarType,
  GraphQLSchema,
  isCompositeType,
  GraphQLLeafType,
  TypeNode,
  NamedTypeNode,
  isEnumType,
  DefinitionNode,
} from 'graphql';
import type {
  GraphQLObjectType,
  GraphQLInterfaceType,
  OperationDefinitionNode,
  FragmentDefinitionNode,
} from 'graphql';
import generate from '@babel/generator';

import type {DocumentDetails, ProjectDetails} from '../types';

import type {Field} from '../../utilities/ast';
import {
  getRootType,
  unwrapType,
  getAllObjectTypes,
  getSelectionTypeMap,
} from '../../utilities/ast';

import {scalarTypeMap} from './utilities';

interface Options {
  importPath(type: GraphQLLeafType): string;
}

interface Context {
  readonly schema: GraphQLSchema;
  readonly rootType?: GraphQLObjectType;
  import(type: GraphQLLeafType): TSType;
  resolveFragment(name: string): FragmentDefinitionNode;
}

export function generateDocumentTypes(
  documentDetails: DocumentDetails,
  project: ProjectDetails,
  {importPath}: Options,
) {
  const {path, document} = documentDetails;

  const operations: OperationDefinitionNode[] = [];
  const fragments: FragmentDefinitionNode[] = [];

  for (const definition of document.definitions) {
    switch (definition.kind) {
      case 'OperationDefinition': {
        operations.push(definition);
        break;
      }
      case 'FragmentDefinition': {
        fragments.push(definition);
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

  const importMap = new Map<string, Set<GraphQLLeafType>>();
  const importCache = new Set<GraphQLLeafType>();
  const fragmentCache = new Map<string, FragmentDefinitionNode>();

  const baseContext: Context = {
    schema: project.schema,
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

      const foundFragment = findFragment(name, documentDetails, project);

      if (foundFragment) {
        fragmentCache.set(name, foundFragment);
        return foundFragment;
      }

      throw new Error(`No fragment found with name ${JSON.stringify(name)}`);
    },
  };

  if (operations.length > 0) {
    const [operation] = operations;

    const rootType = getRootType(operation, project.schema);
    const context = {...baseContext, rootType};

    const name = operation.name?.value ?? 'Unnamed';
    const normalizedName = toTypeName(name);

    const typeName = `${normalizedName}${toTypeName(operation.operation)}Data`;
    const variablesTypeName = `${normalizedName}${toTypeName(
      operation.operation,
    )}Variables`;

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
          t.tsTypeReference(t.identifier(variablesTypeName)),
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

    const operationExports = exportsForSelection(
      typeName,
      getSelectionTypeMap(
        operation.selectionSet.selections,
        rootType,
        context,
      ).get(rootType) ?? new Map(),
      rootType,
      context,
    );

    const operationVariablesExport = variablesExportForOperation(
      variablesTypeName,
      operation,
      context,
    );

    fileBody.push(
      operationTypeImport,
      ...operationExports,
      operationVariablesExport,
      operationVariableDeclaration,
      operationExport,
    );
  } else if (fragments.length > 0) {
    fileBody.push(
      ...fragments
        .map((fragment) => {
          const name = fragment.name.value;
          const normalizedName = toTypeName(name);
          const typeName = `${normalizedName}FragmentData`;
          const onType = baseContext.schema.getType(
            fragment.typeCondition.name.value,
          ) as GraphQLObjectType | GraphQLInterfaceType;

          return exportsForSelection(
            typeName,
            getSelectionTypeMap(
              fragment.selectionSet.selections,
              onType,
              baseContext,
            ).get(onType) ?? new Map(),
            onType,
            baseContext,
          );
        })
        .flat(),
    );
  }

  const schemaImports = [...importMap].map(([source, imported]) => {
    const importDeclaration = t.importDeclaration(
      [...imported].map((typeImport) =>
        t.importSpecifier(
          t.identifier(schemaImportName(typeImport)),
          t.identifier(typeImport.name),
        ),
      ),
      t.stringLiteral(source),
    );

    importDeclaration.importKind = 'type';

    return importDeclaration;
  });

  fileBody.unshift(...schemaImports);

  return generate(t.file(t.program(fileBody), [], [])).code;
}

function findFragment(
  name: string,
  {document, dependencies}: DocumentDetails,
  project: ProjectDetails,
): FragmentDefinitionNode | undefined {
  const inDocumentFragment = findMatchingFragment(name, document.definitions);

  if (inDocumentFragment) return inDocumentFragment;

  for (const dependency of dependencies) {
    const dependencyDocumentDetails = project.documents.get(dependency);

    if (dependencyDocumentDetails == null) continue;

    const dependencyFragment = findMatchingFragment(
      name,
      dependencyDocumentDetails.document.definitions,
    );

    if (dependencyFragment) return dependencyFragment;

    const nestedDependencyFragment = findFragment(
      name,
      dependencyDocumentDetails,
      project,
    );

    if (nestedDependencyFragment) return nestedDependencyFragment;
  }
}

function findMatchingFragment(
  name: string,
  definitions: readonly DefinitionNode[],
) {
  return definitions.find(
    (definition) =>
      definition.kind === 'FragmentDefinition' &&
      definition.name.value === name,
  ) as FragmentDefinitionNode | undefined;
}

function variablesExportForOperation(
  name: string,
  {variableDefinitions = []}: OperationDefinitionNode,
  context: Context,
) {
  return t.exportNamedDeclaration(
    t.tsInterfaceDeclaration(
      t.identifier(name),
      null,
      null,
      t.tsInterfaceBody(
        variableDefinitions.map(({variable, type}) => {
          const unwrappedType = unwrapAstType(type);

          const typescriptType =
            unwrappedType.type in scalarTypeMap
              ? scalarTypeMap[unwrappedType.type]
              : context.import(
                  context.schema.getType(unwrappedType.type) as GraphQLLeafType,
                );

          const maybeListTypescriptType = unwrappedType.isList
            ? t.tsArrayType(
                unwrappedType.isNonNullableListItem
                  ? typescriptType
                  : t.tsUnionType([typescriptType, t.tsNullKeyword()]),
              )
            : typescriptType;

          const property = t.tsPropertySignature(
            t.identifier(variable.name.value),
            t.tsTypeAnnotation(maybeListTypescriptType),
          );

          property.optional = !unwrappedType.isNonNullable;

          return property;
        }),
      ),
    ),
  );
}

function exportsForSelection(
  name: string,
  fieldMap: Map<string, Field>,
  type: GraphQLObjectType | GraphQLInterfaceType,
  context: Context,
) {
  const interfaceBody: TSTypeElement[] = [];
  const namespaceBody: Statement[] = [];

  if (type !== context.rootType) {
    const typenameField = t.tsPropertySignature(
      t.identifier('__typename'),
      t.tsTypeAnnotation(
        t.tsUnionType([t.tsLiteralType(t.stringLiteral(type.name))]),
      ),
    );

    typenameField.readonly = true;

    interfaceBody.push(typenameField);
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
    } else if (isEnumType(unwrappedType.type)) {
      typescriptType = context.import(unwrappedType.type);
    } else if (isObjectType(unwrappedType.type)) {
      typescriptType = t.tsTypeReference(
        t.tsQualifiedName(t.identifier(name), t.identifier(nestedTypeName)),
      );

      namespaceBody.push(
        ...exportsForSelection(
          nestedTypeName,
          getSelectionTypeMap(selections, unwrappedType.type, context).get(
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

      const allTypes = getAllObjectTypes(unwrappedType.type, context.schema);
      const typeMap = getSelectionTypeMap(
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
      ? (() => {
          const type = t.tsTypeOperator(
            t.tsArrayType(
              unwrappedType.isNonNullableListItem
                ? typescriptType
                : t.tsUnionType([typescriptType, t.tsNullKeyword()]),
            ),
          );
          type.operator = 'readonly';
          return type;
        })()
      : typescriptType;

    const interfaceProperty = t.tsPropertySignature(
      t.identifier(fieldNameOrAlias),
      t.tsTypeAnnotation(
        unwrappedType.isNonNullable
          ? maybeListTypescriptType
          : t.tsUnionType([maybeListTypescriptType, t.tsNullKeyword()]),
      ),
    );

    interfaceProperty.readonly = true;

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

function schemaImportName({name}: GraphQLLeafType) {
  return `Schema${name}`;
}

function unwrapAstType(
  type: TypeNode,
): {
  type: string;
  isNonNullable: boolean;
  isList: boolean;
  isNonNullableListItem: boolean;
} {
  let isNonNullable = false;
  let isList = false;
  let isNonNullableListItem = false;
  let finalType = type;

  if (finalType.kind === 'NonNullType') {
    isNonNullable = true;
    finalType = finalType.type;
  }

  if (finalType.kind === 'ListType') {
    isList = true;
    finalType = finalType.type;
  }

  if (finalType.kind === 'NonNullType') {
    isNonNullableListItem = true;
    finalType = finalType.type;
  }

  return {
    isNonNullable,
    isList,
    isNonNullableListItem,
    type: (finalType as NamedTypeNode).name.value,
  };
}

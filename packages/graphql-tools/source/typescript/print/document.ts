import {relative} from 'path';
import * as t from '@babel/types';
import type {Statement, TSType, TSTypeElement} from '@babel/types';
import {
  isObjectType,
  isScalarType,
  isCompositeType,
  isInterfaceType,
  TypeNode,
  isEnumType,
} from 'graphql';
import type {
  DocumentNode,
  GraphQLSchema,
  GraphQLLeafType,
  NamedTypeNode,
  DefinitionNode,
  GraphQLObjectType,
  GraphQLInterfaceType,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  GraphQLCompositeType,
} from 'graphql';
import {
  getRootType,
  unwrapType,
  getAllObjectTypes,
  getSelectionTypeMap,
  type Field,
} from '@quilted/graphql/ast';

import type {DocumentDetails, ProjectDetails} from '../types.ts';
import type {DocumentOutputKind} from '../../configuration.ts';

import {
  addTypename,
  minify,
  toGraphQLOperation,
} from '../../utilities/document.ts';

import generate from './generate.ts';
import {scalarTypeMap} from './utilities.ts';

interface Options {
  kind: DocumentOutputKind;
  package: string;
  importPath(type: GraphQLLeafType): string;
}

interface Context {
  readonly kind: DocumentOutputKind;
  readonly schema: GraphQLSchema;
  readonly rootType?: GraphQLObjectType;
  import(type: GraphQLLeafType): TSType;
  resolveFragment(name: string): FragmentDefinitionNode;
}

export function generateDocumentTypes(
  documentDetails: DocumentDetails,
  project: ProjectDetails,
  {kind, importPath, package: pkg}: Options,
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
    kind,
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

  const [operation] = operations;

  if (operation != null) {
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
      t.stringLiteral(pkg),
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

    const isType = kind.kind === 'types';

    const operationVariableInit = isType
      ? undefined
      : createDocumentExportValue(document, kind);

    const operationVariableDeclaration = t.variableDeclaration('const', [
      t.variableDeclarator(operationExportIdentifier, operationVariableInit),
    ]);

    operationVariableDeclaration.declare = isType;

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

    // Mark all top-level namespace exports as `declare` so Babel
    // doesn’t complain about them.
    for (const {declaration} of operationExports) {
      if (declaration?.type !== 'TSModuleDeclaration') continue;
      declaration.declare = true;
    }

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

  return generate(t.file(t.program(fileBody), [], []) as any).code;
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
              ? scalarTypeMap[unwrappedType.type]!
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
            t.tsTypeAnnotation(
              unwrappedType.isNonNullable
                ? maybeListTypescriptType
                : t.tsUnionType([maybeListTypescriptType, t.tsNullKeyword()]),
            ),
          );

          property.optional = !unwrappedType.isNonNullable;
          property.readonly = true;

          return property;
        }),
      ),
    ),
  );
}

function createTypenameProperty(
  type: GraphQLObjectType | GraphQLInterfaceType,
  context: Context & {typenames?: string[]},
) {
  const possibleTypenames =
    context.typenames ??
    (isObjectType(type)
      ? [type.name]
      : getAllObjectTypes(type, context.schema).map((type) => type.name));

  const typenameField = t.tsPropertySignature(
    t.identifier('__typename'),
    t.tsTypeAnnotation(
      t.tsUnionType(
        possibleTypenames.map((typename) =>
          t.tsLiteralType(t.stringLiteral(typename)),
        ),
      ),
    ),
  );

  typenameField.readonly = true;

  return typenameField;
}

function exportsForSelection(
  name: string,
  fieldMap: Map<string, Field>,
  type: GraphQLObjectType | GraphQLInterfaceType,
  context: Context & {typenames?: string[]},
) {
  const interfaceBody: TSTypeElement[] = [];
  const namespaceBody: Statement[] = [];

  const {addTypename = false} = context.kind;

  if (addTypename) {
    interfaceBody.push(createTypenameProperty(type, context));
  }

  for (const [fieldNameOrAlias, fieldDetails] of fieldMap) {
    if (fieldDetails.name === '__typename') {
      // Already added typename, above
      if (!addTypename) {
        interfaceBody.push(createTypenameProperty(type, context));
      }

      continue;
    }

    const nestedTypeName = toTypeName(fieldNameOrAlias);

    const {type: fieldType, selections} = fieldDetails;
    const unwrappedType = unwrapType(fieldType);

    let typescriptType: TSType;

    if (isScalarType(unwrappedType.type)) {
      if (unwrappedType.type.name in scalarTypeMap) {
        typescriptType = scalarTypeMap[unwrappedType.type.name]!;
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

      const typescriptUnionMembers: string[] = [];

      const interfaceTypeMap = new Map<
        GraphQLInterfaceType,
        readonly GraphQLObjectType<any, any>[]
      >();

      for (const type of typeMap.keys()) {
        if (isInterfaceType(type)) {
          const concreteTypes = getAllObjectTypes(type, context.schema);
          interfaceTypeMap.set(type, concreteTypes);
        }
      }

      // Sort the map entries based on the number of concrete types (ascending order)
      const sortedInterfaceTypeMap = new Map(
        [...interfaceTypeMap.entries()].sort(
          (a, b) => a[1].length - b[1].length,
        ),
      );

      const {matched: matchedTypes, unmatched: unmatchedTypes} =
        allTypes.reduce<{
          matched: Set<GraphQLObjectType>;
          unmatched: Set<GraphQLObjectType>;
        }>(
          (all, type) => {
            if (typeMap.has(type)) {
              all.matched.add(type);
            } else {
              all.unmatched.add(type);
            }

            return all;
          },
          {matched: new Set(), unmatched: new Set()},
        );

      for (const matchedType of matchedTypes) {
        const fieldMap = typeMap.get(matchedType)!;

        const name = toUnionOrInterfaceTypeName(nestedTypeName, matchedType);
        typescriptUnionMembers.push(name);

        namespaceBody.push(
          ...exportsForSelection(name, fieldMap, matchedType, context),
        );
      }

      for (const [interfaceType, objectTypes] of sortedInterfaceTypeMap) {
        if (unmatchedTypes.size === 0) break;

        const typenames: string[] = [];
        for (const objectType of objectTypes) {
          if (!unmatchedTypes.has(objectType)) continue;
          unmatchedTypes.delete(objectType);
          typenames.push(objectType.name);
        }

        if (typenames.length === 0) continue;

        const name = toUnionOrInterfaceTypeName(nestedTypeName, interfaceType);
        typescriptUnionMembers.push(name);

        namespaceBody.push(
          ...exportsForSelection(name, fieldMap, interfaceType, {
            ...context,
            typenames,
          }),
        );
      }

      for (const type of unmatchedTypes) {
        const name = toUnionOrInterfaceTypeName(nestedTypeName, type);
        typescriptUnionMembers.push(name);

        namespaceBody.push(
          t.exportNamedDeclaration(
            t.tsInterfaceDeclaration(
              t.identifier(name),
              null,
              null,
              t.tsInterfaceBody(
                addTypename
                  ? [
                      t.tsPropertySignature(
                        t.identifier('__typename'),
                        t.tsTypeAnnotation(
                          t.tsLiteralType(t.stringLiteral(type.name)),
                        ),
                      ),
                    ]
                  : [],
              ),
            ),
          ),
        );
      }
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
    const tsModule = t.tsModuleDeclaration(
      t.identifier(name),
      t.tsModuleBlock(namespaceBody),
    );

    exported.push(t.exportNamedDeclaration(tsModule));
  }

  return exported;
}

function toUnionOrInterfaceTypeName(
  rootName: string,
  type: GraphQLCompositeType,
) {
  return `${rootName}_${toTypeName(type.name)}`;
}

function toTypeName(name: string) {
  return `${name[0]!.toLocaleUpperCase()}${name.substring(1)}`;
}

function schemaImportName({name}: GraphQLLeafType) {
  return `Schema${name}`;
}

function unwrapAstType(type: TypeNode): {
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

function createDocumentExportValue(
  document: DocumentNode,
  outputKind: DocumentOutputKind,
) {
  const {addTypename: shouldAddTypename = false} = outputKind;

  const minifiedDocument = minify(
    shouldAddTypename ? addTypename(document, {clone: true}) : document,
    {clone: !shouldAddTypename},
  );

  const {id, name, type, source} = toGraphQLOperation(minifiedDocument);

  return t.objectExpression([
    t.objectProperty(t.identifier('id'), t.stringLiteral(id)),
    ...(type
      ? [t.objectProperty(t.identifier('type'), t.stringLiteral(type))]
      : []),
    t.objectProperty(
      t.identifier('name'),
      name ? t.stringLiteral(name) : t.identifier('undefined'),
    ),
    t.objectProperty(t.identifier('source'), t.stringLiteral(source)),
  ]);
}

import * as t from '@babel/types';
import generate from '@babel/generator';
import {
  GraphQLSchema,
  isEnumType,
  GraphQLEnumType,
  isInputType,
  GraphQLScalarType,
  isScalarType,
  GraphQLInputObjectType,
  isNonNullType,
  GraphQLInputType,
  isListType,
} from 'graphql';

import {scalarTypeMap} from '../utilities';

export interface ScalarDefinition {
  name: string;
  package: string;
}

export interface Options {
  customScalars?: {[key: string]: ScalarDefinition};
}

export function generateSchemaTypes(
  schema: GraphQLSchema,
  options: Options = {},
) {
  const fileBody: t.Statement[] = [];
  const definitions = new Map<string, string>();

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isInputType(type) || type.name.startsWith('__')) {
      continue;
    }

    if (
      isScalarType(type) &&
      Object.prototype.hasOwnProperty.call(scalarTypeMap, type.name)
    ) {
      continue;
    }

    if (isEnumType(type)) {
      fileBody.push(t.exportNamedDeclaration(tsTypeAliasForEnum(type)));
    } else if (isScalarType(type)) {
      const {customScalars = {}} = options;
      const customScalarDefinition = customScalars[type.name];
      const scalarType = tsScalarForType(type, customScalarDefinition);

      if (customScalarDefinition) {
        fileBody.unshift(
          t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier(
                  makeCustomScalarImportNameSafe(
                    customScalarDefinition.name,
                    type.name,
                  ),
                ),
                t.identifier(customScalarDefinition.name),
              ),
            ],
            t.stringLiteral(customScalarDefinition.package),
          ),
          t.exportNamedDeclaration(scalarType, []),
        );
      } else {
        fileBody.push(t.exportNamedDeclaration(scalarType, []));
      }
    } else {
      fileBody.push(t.exportNamedDeclaration(tsInputObjectForType(type), []));
    }
  }

  definitions.set(
    'index.ts',
    generate(t.file(t.program(fileBody), [], [])).code,
  );

  return definitions;
}

function tsTypeForInputType(type: GraphQLInputType): t.TSType {
  const unwrappedType = isNonNullType(type) ? type.ofType : type;

  let tsType: t.TSType;

  if (isListType(unwrappedType)) {
    const tsTypeOfContainedType = tsTypeForInputType(unwrappedType.ofType);
    tsType = t.tsArrayType(
      t.isTSUnionType(tsTypeOfContainedType)
        ? t.tsParenthesizedType(tsTypeOfContainedType)
        : tsTypeOfContainedType,
    );
  } else if (isScalarType(unwrappedType)) {
    tsType =
      scalarTypeMap[unwrappedType.name] ||
      t.tsTypeReference(t.identifier(unwrappedType.name));
  } else {
    tsType = t.tsTypeReference(t.identifier(unwrappedType.name));
  }

  return isNonNullType(type)
    ? tsType
    : t.tsUnionType([tsType, t.tsNullKeyword()]);
}

function tsInputObjectForType(type: GraphQLInputObjectType) {
  const fields = Object.entries(type.getFields()).map(([name, field]) => {
    const property = t.tsPropertySignature(
      t.identifier(name),
      t.tsTypeAnnotation(tsTypeForInputType(field.type)),
    );
    property.optional = !isNonNullType(field.type);
    return property;
  });

  return t.tsInterfaceDeclaration(
    t.identifier(type.name),
    null,
    null,
    t.tsInterfaceBody(fields),
  );
}

function tsTypeAliasForEnum(type: GraphQLEnumType) {
  return t.tsTypeAliasDeclaration(
    t.identifier(type.name),
    null,
    t.tsUnionType(
      type
        .getValues()
        .map((value) => t.tsLiteralType(t.stringLiteral(value.name))),
    ),
  );
}

function tsScalarForType(
  type: GraphQLScalarType,
  customScalarDefinition?: ScalarDefinition,
) {
  const alias = customScalarDefinition
    ? t.tsTypeReference(
        t.identifier(
          makeCustomScalarImportNameSafe(
            customScalarDefinition.name,
            type.name,
          ),
        ),
      )
    : t.tsStringKeyword();

  return t.tsTypeAliasDeclaration(t.identifier(type.name), null, alias);
}

function makeCustomScalarImportNameSafe(importName: string, typeName: string) {
  return `__${typeName}__${importName}`;
}

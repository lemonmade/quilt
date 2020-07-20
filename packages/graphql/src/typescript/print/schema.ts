import * as t from '@babel/types';
import generate from '@babel/generator';
import {
  isEnumType,
  isInputType,
  isScalarType,
  isNonNullType,
  isListType,
} from 'graphql';
import type {
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLInputType,
} from 'graphql';

import {scalarTypeMap} from './utilities';

export interface ScalarDefinition {
  name: string;
  package?: string;
}

export interface Options {
  customScalars?: {[key: string]: ScalarDefinition};
}

export function generateSchemaTypes(
  schema: GraphQLSchema,
  options: Options = {},
) {
  const importMap = new Map<string, Set<string>>();
  const fileBody: t.Statement[] = [];

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
      fileBody.push(t.exportNamedDeclaration(tsTypeForEnum(type)));
    } else if (isScalarType(type)) {
      const {customScalars = {}} = options;
      const customScalarDefinition = customScalars[type.name];

      if (customScalarDefinition?.package) {
        const imported =
          importMap.get(customScalarDefinition.package) ?? new Set();

        imported.add(customScalarDefinition.name);
        importMap.set(customScalarDefinition.package, imported);
      }

      const scalarType = tsScalarForType(type, customScalarDefinition);
      fileBody.push(t.exportNamedDeclaration(scalarType));
    } else {
      fileBody.push(t.exportNamedDeclaration(tsInputObjectForType(type)));
    }
  }

  const file = t.file(
    t.program([
      ...Array.from(importMap.entries()).map(([pkg, imported]) => {
        return t.importDeclaration(
          [...imported].map((importName) =>
            t.importSpecifier(
              t.identifier(importName),
              t.identifier(importName),
            ),
          ),
          t.stringLiteral(pkg),
        );
      }),
      ...fileBody,
    ]),
  );

  return generate(file).code;
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

function tsScalarForType(
  type: GraphQLScalarType,
  customScalarDefinition?: ScalarDefinition,
) {
  const alias = customScalarDefinition
    ? t.tsTypeReference(t.identifier(customScalarDefinition.name))
    : t.tsStringKeyword();

  return t.tsTypeAliasDeclaration(t.identifier(type.name), null, alias);
}

function tsTypeForEnum(type: GraphQLEnumType) {
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

import * as t from '@babel/types';
import {
  isEnumType,
  isScalarType,
  isUnionType,
  isNonNullType,
  isListType,
  isInputObjectType,
  printSchema,
  isInterfaceType,
} from 'graphql';
import type {
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLType,
  GraphQLField,
  GraphQLNamedType,
} from 'graphql';

import type {PrintSchemaOptions, ScalarDefinition} from '../../configuration';

import generate from './generate';
import {scalarTypeMap} from './utilities';

export function generateSchemaTypes(
  schema: GraphQLSchema,
  {customScalars = {}, kind}: PrintSchemaOptions,
) {
  const importMap = new Map<string, Set<string>>();
  const fileBody: t.Statement[] = [];

  const printOutputTypes = kind.kind !== 'inputTypes';

  for (const type of Object.values(schema.getTypeMap())) {
    if (excludeTypeFromGeneration(type)) {
      continue;
    }

    if (isEnumType(type)) {
      fileBody.push(t.exportNamedDeclaration(tsTypeForEnum(type)));
    } else if (isScalarType(type)) {
      const customScalarDefinition = customScalars[type.name];

      if (customScalarDefinition?.package) {
        const imported =
          importMap.get(customScalarDefinition.package) ?? new Set();

        imported.add(customScalarDefinition.name);
        importMap.set(customScalarDefinition.package, imported);
      }

      const scalarType = tsScalarForType(type, customScalarDefinition);
      fileBody.push(t.exportNamedDeclaration(scalarType));
    } else if (isUnionType(type)) {
      if (printOutputTypes) {
        fileBody.push(t.exportNamedDeclaration(tsTypeForUnion(type)));
      }
    } else if (isInputObjectType(type)) {
      fileBody.push(
        t.exportNamedDeclaration(tsInterfaceForInputObjectType(type)),
      );
    } else if (isInterfaceType(type)) {
      if (printOutputTypes) {
        fileBody.push(
          t.exportNamedDeclaration(tsInterfaceForInterfaceType(type, schema)),
        );
      }
    } else if (printOutputTypes) {
      fileBody.push(t.exportNamedDeclaration(tsInterfaceForObjectType(type)));
    }
  }

  if (printOutputTypes) {
    fileBody.push(t.exportNamedDeclaration(tsTypeForSchema(schema)));
  }

  if (kind.kind === 'definitions') {
    fileBody.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('schema'),
          t.templateLiteral(
            [t.templateElement({raw: `\n${printSchema(schema)}\n`})],
            [],
          ),
        ),
      ]),
      t.exportDefaultDeclaration(t.identifier('schema')),
    );
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

function excludeTypeFromGeneration(type: GraphQLNamedType) {
  return (
    type.name.startsWith('__') ||
    (isScalarType(type) &&
      Object.prototype.hasOwnProperty.call(scalarTypeMap, type.name))
  );
}

function tsTypeForSchema(schema: GraphQLSchema) {
  const fields = Object.values(schema.getTypeMap())
    .filter((type) => !excludeTypeFromGeneration(type))
    .map((type) => {
      return t.tsPropertySignature(
        t.identifier(type.name),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier(type.name))),
      );
    });

  return t.tsInterfaceDeclaration(
    t.identifier('Schema'),
    null,
    null,
    t.tsInterfaceBody(fields),
  );
}

function tsTypeReferenceForGraphQLType(type: GraphQLType): t.TSType {
  const unwrappedType = isNonNullType(type) ? type.ofType : type;

  let tsType: t.TSType;

  if (isListType(unwrappedType)) {
    const tsTypeOfContainedType = tsTypeReferenceForGraphQLType(
      unwrappedType.ofType,
    );
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

function tsInterfaceForInputObjectType(type: GraphQLInputObjectType) {
  const fields = Object.entries(type.getFields()).map(([name, field]) => {
    const property = t.tsPropertySignature(
      t.identifier(name),
      t.tsTypeAnnotation(tsTypeReferenceForGraphQLType(field.type)),
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

function tsInterfaceForInterfaceType(
  type: GraphQLInterfaceType,
  schema: GraphQLSchema,
) {
  const fields = Object.entries(type.getFields()).map(([name, field]) => {
    return t.tsMethodSignature(
      t.identifier(name),
      null,
      [variableIdentifierForField(field)],
      t.tsTypeAnnotation(tsTypeReferenceForGraphQLType(field.type)),
    );
  });

  return t.tsInterfaceDeclaration(
    t.identifier(type.name),
    null,
    null,
    t.tsInterfaceBody([
      t.tsPropertySignature(
        t.identifier('__possibleTypes'),
        t.tsTypeAnnotation(
          t.tsUnionType(
            schema
              .getPossibleTypes(type)
              .map((value) => t.tsTypeReference(t.identifier(value.name))),
          ),
        ),
      ),
      ...fields,
    ]),
  );
}

function tsInterfaceForObjectType(type: GraphQLObjectType) {
  const fields = Object.entries(type.getFields()).map(([name, field]) => {
    return t.tsMethodSignature(
      t.identifier(name),
      null,
      [variableIdentifierForField(field)],
      t.tsTypeAnnotation(tsTypeReferenceForGraphQLType(field.type)),
    );
  });

  return t.tsInterfaceDeclaration(
    t.identifier(type.name),
    null,
    null,
    t.tsInterfaceBody([
      t.tsPropertySignature(
        t.identifier('__typename'),
        t.tsTypeAnnotation(t.tsLiteralType(t.stringLiteral(type.name))),
      ),
      ...fields,
    ]),
  );
}

function variableIdentifierForField(field: GraphQLField<any, any>) {
  const identifier = t.identifier('variables');
  identifier.typeAnnotation = t.tsTypeAnnotation(
    field.args.length === 0
      ? t.tSTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsNeverKeyword(),
          ]),
        )
      : t.tsTypeLiteral(
          field.args.map(({name, type}) => {
            const property = t.tsPropertySignature(
              t.identifier(name),
              t.tsTypeAnnotation(tsTypeReferenceForGraphQLType(type)),
            );
            property.optional = !isNonNullType(type);
            property.readonly = true;
            return property;
          }),
        ),
  );
  return identifier;
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

function tsTypeForUnion(type: GraphQLUnionType) {
  return t.tsTypeAliasDeclaration(
    t.identifier(type.name),
    null,
    t.tsUnionType(
      type
        .getTypes()
        .map((value) => t.tsTypeReference(t.identifier(value.name))),
    ),
  );
}

import {
  buildSchema,
  isScalarType,
  isUnionType,
  isObjectType,
  isInterfaceType,
  type GraphQLSchema,
} from 'graphql';

export function createGraphQLSchema(
  source: string,
  resolvers: Record<string, Record<string, any>> = {},
): GraphQLSchema {
  const schema = buildSchema(source);

  for (const typeName in resolvers) {
    const type = schema.getType(typeName);
    const resolverValue = resolvers[typeName];

    if (isScalarType(type)) {
      for (const fieldName in resolverValue) {
        (type as any)[
          fieldName.startsWith('__') ? fieldName.substring(2) : fieldName
        ] = resolverValue[fieldName];
      }
    } else if (isUnionType(type)) {
      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          (type as any)[fieldName.substring(2)] = resolverValue[fieldName];
        }
      }
    } else if (isObjectType(type) || isInterfaceType(type)) {
      const fields = type.getFields();

      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          (type as any)[fieldName.substring(2)] = resolverValue[fieldName];
          continue;
        }

        const field = fields[fieldName];
        if (field != null) {
          const fieldResolve = resolverValue[fieldName];

          if (typeof fieldResolve === 'function') {
            field.resolve = fieldResolve.bind(resolverValue);
          } else {
            Object.assign(field, fieldResolve);
          }
        }
      }
    }
  }

  return schema;
}

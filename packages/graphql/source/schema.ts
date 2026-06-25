import {
  buildSchema,
  isScalarType,
  isUnionType,
  isObjectType,
  isInterfaceType,
  type GraphQLSchema,
} from 'graphql';

// graphql-js 17 renamed the scalar coercion methods; map each legacy name to
// its v17 equivalent so customisations apply on both majors.
const SCALAR_COERCION_ALIASES: Record<string, string> = {
  serialize: 'coerceOutputValue',
  parseValue: 'coerceInputValue',
  parseLiteral: 'coerceInputLiteral',
};

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
        const key = fieldName.startsWith('__')
          ? fieldName.substring(2)
          : fieldName;
        const value = resolverValue[fieldName];
        (type as any)[key] = value;
        // graphql-js 17 renamed the scalar coercion methods and reads the new
        // names at execution time (the old ones linger only as deprecated
        // config aliases). Set both so a customised `serialize` / `parseValue`
        // / `parseLiteral` keeps taking effect on graphql 16 *and* 17.
        const renamed = SCALAR_COERCION_ALIASES[key];
        if (renamed != null) (type as any)[renamed] = value;
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

import {type GraphQLResult} from '@quilted/quilt';
import {type GraphQLSchema} from 'graphql';

export async function performGraphQLOperation<Data = Record<string, unknown>>(
  operation: string,
  {
    variables,
    operationName,
  }: {variables?: Record<string, unknown>; operationName?: string} = {},
) {
  const [schema, {execute, parse}] = await Promise.all([
    getSchema(),
    import('graphql'),
  ]);

  const result = await execute({
    schema,
    document: parse(operation),
    operationName,
    variableValues: variables,
    rootValue: {name: () => 'Winston'},
  });

  return result as GraphQLResult<Data>;
}

let schemaPromise: Promise<GraphQLSchema>;

function getSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const [{buildSchema}, {default: schemaSource}] = await Promise.all([
        import('graphql'),
        import('../graphql/schema'),
      ]);

      return buildSchema(schemaSource);
    })();
  }

  return schemaPromise;
}

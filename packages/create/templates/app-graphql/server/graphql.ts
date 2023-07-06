import {execute} from 'graphql';
import {
  createGraphQLSchema,
  createGraphQLResolverBuilder,
} from '@quilted/quilt/graphql/server';
import type {GraphQLResult, GraphQLSource} from '@quilted/quilt/graphql';

import schemaSource, {type Schema} from '../graphql/schema.ts';

const {createResolver, createQueryResolver} =
  createGraphQLResolverBuilder<Schema>();

const Person = createResolver('Person', {
  name: 'Winston',
});

const Query = createQueryResolver({
  me: () => ({}),
});

const schema = createGraphQLSchema(schemaSource, {Query, Person});

export async function performGraphQLOperation<
  Data = Record<string, unknown>,
  Variables = Record<string, unknown>,
>(
  operation: GraphQLSource<Data, Variables>,
  {
    variables,
    operationName,
  }: {variables?: Variables; operationName?: string} = {},
) {
  const result = await execute({
    schema,
    source: operation,
    operationName,
    variableValues: variables,
    rootValue: {name: () => 'Winston'},
  });

  return result as GraphQLResult<Data>;
}

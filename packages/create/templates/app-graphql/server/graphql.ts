import {graphql} from 'graphql';
import {
  toGraphQLSource,
  type GraphQLFetch,
  type GraphQLResult,
} from '@quilted/quilt/graphql';
import {
  createGraphQLSchema,
  createGraphQLResolverBuilder,
} from '@quilted/quilt/graphql/server';

import schemaSource, {type Schema} from '../graphql/schema.ts';

interface GraphQLValues {
  Person: {};
}

const {createResolver, createQueryResolver} = createGraphQLResolverBuilder<
  Schema,
  GraphQLValues
>();

const Person = createResolver('Person', {
  name: async () => 'Winston',
});

const Query = createQueryResolver({
  me: () => ({}),
});

const schema = createGraphQLSchema(schemaSource, {Query, Person});

export const performGraphQLOperation: GraphQLFetch =
  async function performGraphQLOperation(operation, options) {
    const result = await graphql({
      schema,
      source: toGraphQLSource(operation),
      variableValues: options?.variables as Readonly<{}>,
    });

    return result as GraphQLResult<any>;
  };

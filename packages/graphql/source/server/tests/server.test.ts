import {describe, it, expect} from '@quilted/testing';

import {graphql as runGraphQL, type GraphQLSchema} from 'graphql';

import {graphql} from '../../gql.ts';
import {createGraphQLSchema} from '../../schema.ts';

import {createGraphQLResolverBuilder} from '../server.ts';

describe('resolvers', () => {
  it('can add root resolver fields', async () => {
    const {createQueryResolver} = createGraphQLResolverBuilder<{
      Query: {
        __typename: 'Query';
        greeting(variables: Record<string, never>): string;
      };
    }>();

    const Query = createQueryResolver({
      greeting() {
        return 'Hello, world!';
      },
    });

    const schema = createGraphQLSchema(
      graphql`
        type Query {
          greeting: String!
        }
      `,
      {Query},
    );

    const result = await query(
      graphql`
        query {
          greeting
        }
      `,
      schema,
    );

    expect(result).toStrictEqual({greeting: 'Hello, world!'});
  });

  it('can add object resolver fields', async () => {
    interface Query {
      __typename: 'Query';
      dog(variables: {name: string}): Dog;
    }

    interface Dog {
      __typename: 'Dog';
      name(variables: Record<string, never>): string;
      nickname(variables: Record<string, never>): string | null;
    }

    const {createQueryResolver, createResolver} = createGraphQLResolverBuilder<
      {
        Query: Query;
        Dog: Dog;
      },
      {Dog: {name: string}}
    >();

    const Query = createQueryResolver({
      async dog(_, {name}) {
        return {name};
      },
    });

    const Dog = createResolver('Dog', {
      nickname({name}) {
        return name === 'Winston' ? 'Winnie' : null;
      },
    });

    const schema = createGraphQLSchema(
      graphql`
        type Query {
          dog(name: String!): Dog!
        }

        type Dog {
          name: String!
          nickname: String
        }
      `,
      {Query, Dog},
    );

    const winstonResult = await query(
      graphql`
        query {
          dog(name: "Winston") {
            name
            nickname
          }
        }
      `,
      schema,
    );

    expect(winstonResult).toStrictEqual({
      dog: {name: 'Winston', nickname: 'Winnie'},
    });

    const mollyResult = await query(
      graphql`
        query {
          dog(name: "Molly") {
            name
            nickname
          }
        }
      `,
      schema,
    );

    expect(mollyResult).toStrictEqual({
      dog: {name: 'Molly', nickname: null},
    });
  });
});

async function query(query: string, schema: GraphQLSchema) {
  const {data} = await runGraphQL({
    schema,
    source: query,
  });

  // Make this a "real" object so we can use `.toStrictEqual()` with it
  return JSON.parse(JSON.stringify(data));
}

import {describe, it, expect} from 'vitest';

import {
  graphql as runGraphQL,
  GraphQLError,
  Kind,
  type GraphQLSchema,
} from 'graphql';

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

describe('scalar coercion', () => {
  // graphql-js 17 reads the renamed `coerceInputValue` / `coerceOutputValue` /
  // `coerceInputLiteral` scalar methods at execution and fixes them at
  // construction, so `createGraphQLSchema` must assign those (not only the
  // legacy `serialize` / `parseValue` / `parseLiteral`) for a custom scalar's
  // input validation to keep running. Without it, a bad value passed through a
  // variable is silently accepted on v17. Verified against graphql 16 and 17.
  function schemaWithTimezone() {
    return createGraphQLSchema(
      graphql`
        scalar Timezone
        type Query {
          echo(timezone: Timezone!): Timezone!
        }
      `,
      {
        Timezone: {
          __serialize: (value: unknown) => String(value),
          __parseValue: (value: unknown) => {
            if (typeof value !== 'string' || !value.includes('/')) {
              throw new GraphQLError(`Invalid timezone: ${String(value)}`);
            }
            return value;
          },
          __parseLiteral: (ast: {kind: string; value?: string}) => {
            if (ast.kind !== Kind.STRING || !ast.value?.includes('/')) {
              throw new GraphQLError('Invalid timezone literal');
            }
            return ast.value;
          },
        },
        Query: {
          echo(_: unknown, {timezone}: {timezone: string}) {
            return timezone;
          },
        },
      },
    );
  }

  it('runs a custom scalar parser on a variable value', async () => {
    const result = await runGraphQL({
      schema: schemaWithTimezone(),
      source: `query ($tz: Timezone!) { echo(timezone: $tz) }`,
      variableValues: {tz: 'Asia/Tokyo'},
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({echo: 'Asia/Tokyo'});
  });

  it('rejects an invalid variable value at the scalar layer', async () => {
    const result = await runGraphQL({
      schema: schemaWithTimezone(),
      source: `query ($tz: Timezone!) { echo(timezone: $tz) }`,
      variableValues: {tz: 'not-a-timezone'},
    });

    expect(result.data).toBeUndefined();
    expect(result.errors?.[0]?.message).toMatch(/Invalid timezone/);
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

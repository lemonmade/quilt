import {describe, it, expect} from '@quilted/testing';

import {graphql} from '../../gql.ts';
import {createGraphQLSchema} from '../../schema.ts';

import {GraphQLController} from '../controller.ts';
import {createGraphQLFiller} from '../filler.ts';

describe('graphql testing', () => {
  it('fills a query with random data', async () => {
    const schema = createGraphQLSchema(graphql`
      type Person {
        name: String!
        age: Int!
      }

      type Query {
        me: Person!
      }
    `);

    const query = graphql`
      query Me {
        me {
          name
          age
        }
      }
    `;

    const fill = createGraphQLFiller(schema);
    const controller = new GraphQLController([fill(query)]);

    expect(await controller.fetch(query)).toStrictEqual({
      data: {
        me: {
          name: expect.any(String),
          age: expect.any(Number),
        },
      },
    });
  });

  it('fills a query with a subset of the data pre-filled', async () => {
    const schema = createGraphQLSchema(graphql`
      type Person {
        name: String!
        age: Int!
      }

      type Query {
        me: Person!
      }
    `);

    const query = graphql`
      query Me {
        me {
          name
          age
        }
      }
    `;

    const name = 'Winston';

    const fill = createGraphQLFiller(schema);
    const controller = new GraphQLController([fill(query, {me: {name}})]);

    expect(await controller.fetch(query)).toStrictEqual({
      data: {
        me: {
          name,
          age: expect.any(Number),
        },
      },
    });
  });

  it('selects a random member for union types', async () => {
    const schema = createGraphQLSchema(graphql`
      enum Version {
        V1
        V2
      }

      type Query {
        version: Version!
      }
    `);

    const query = graphql`
      query {
        version
      }
    `;

    const fill = createGraphQLFiller(schema);
    const controller = new GraphQLController([fill(query)]);

    expect(await controller.fetch(query)).toStrictEqual({
      data: {
        version: expect.stringMatching(/^(V1|V2)$/),
      },
    });
  });

  it('allows selecting a specific union member by typename', async () => {
    const schema = createGraphQLSchema(graphql`
      type Bike {
        tandem: Boolean!
      }

      type RollerBlades {
        size: Int!
      }

      union Transport = Bike | RollerBlades

      type Query {
        transport: Transport!
      }
    `);

    const query = graphql`
      query Transport {
        transport {
          __typename
          ... on Bike {
            tandem
          }
          ... on RollerBlades {
            size
          }
        }
      }
    `;

    const fill = createGraphQLFiller(schema);
    const controller = new GraphQLController([
      fill(query, {transport: {__typename: 'Bike'}}),
    ]);

    expect(await controller.fetch(query)).toStrictEqual({
      data: {
        transport: {
          __typename: 'Bike',
          tandem: expect.any(Boolean),
        },
      },
    });
  });
});

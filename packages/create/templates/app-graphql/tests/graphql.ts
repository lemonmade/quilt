import {
  TestGraphQL,
  createGraphQLSchema,
  createGraphQLFiller,
  createGraphQLController,
  type GraphQLController,
} from '@quilted/quilt/graphql/testing';

import schemaSource from '../graphql/schema.ts';

export const schema = createGraphQLSchema(schemaSource);
export const fillGraphQL = createGraphQLFiller(schema);

export {createGraphQLController, TestGraphQL, type GraphQLController};

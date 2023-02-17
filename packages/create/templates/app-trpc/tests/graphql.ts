import {
  TestGraphQL,
  createGraphQLSchema,
  createGraphQLFiller,
  createGraphQLController,
  type GraphQLController,
} from '@quilted/quilt/graphql/testing';

import schema from '../graphql/schema';

export const fillGraphQL = createGraphQLFiller(createGraphQLSchema(schema));

export {createGraphQLController, TestGraphQL, type GraphQLController};

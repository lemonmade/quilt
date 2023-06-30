import {buildSchema} from 'graphql';
import {
  TestGraphQL,
  createGraphQLFiller,
  createGraphQLController,
  type GraphQLController,
} from '@quilted/quilt/graphql/testing';

import schema from '../graphql/schema.ts';

export const fillGraphQL = createGraphQLFiller(buildSchema(schema));

export {createGraphQLController, TestGraphQL, type GraphQLController};

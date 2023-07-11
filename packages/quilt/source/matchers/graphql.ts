import type {
  GraphQLAnyOperation,
  GraphQLController,
} from '@quilted/graphql/testing';

import {toHavePerformedGraphQLOperation} from './graphql/operations.ts';

declare global {
  // As far as I know, this is needed for the module augmentation  to work.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toHavePerformedGraphQLOperation<Variables>(
        graphql: GraphQLController,
        operation: GraphQLAnyOperation<any, Variables>,
        variables?: Variables,
      ): void;
    }
  }
}

expect.extend({
  toHavePerformedGraphQLOperation,
});

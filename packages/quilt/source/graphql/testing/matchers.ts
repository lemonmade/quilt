import {expect} from '@quilted/testing';
import type {GraphQLAnyOperation} from '@quilted/graphql/testing';

import {toHavePerformedGraphQLOperation} from './matchers/operations.ts';

declare global {
  // As far as I know, this is needed for the module augmentation  to work.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toHavePerformedGraphQLOperation<Variables>(
        operation: GraphQLAnyOperation<any, Variables>,
        variables?: Variables,
      ): void;
      toHavePerformedGraphQLQuery<Variables>(
        query: GraphQLAnyOperation<any, Variables>,
        variables?: Variables,
      ): void;
      toHavePerformedGraphQLMutation<Variables>(
        mutation: GraphQLAnyOperation<any, Variables>,
        variables?: Variables,
      ): void;
    }
  }
}

expect.extend({
  toHavePerformedGraphQLOperation,
  toHavePerformedGraphQLQuery: toHavePerformedGraphQLOperation,
  toHavePerformedGraphQLMutation: toHavePerformedGraphQLOperation,
});

import type {GraphQLAnyOperation} from '@quilted/graphql/testing';

import {toHavePerformedGraphQLOperation} from './matchers/operations.ts';

export interface CustomMatchers<R = unknown> {
  toHavePerformedGraphQLOperation<Variables>(
    operation: GraphQLAnyOperation<any, Variables>,
    variables?: Variables,
  ): R;
  toHavePerformedGraphQLQuery<Variables>(
    query: GraphQLAnyOperation<any, Variables>,
    variables?: Variables,
  ): R;
  toHavePerformedGraphQLMutation<Variables>(
    mutation: GraphQLAnyOperation<any, Variables>,
    variables?: Variables,
  ): R;
}

export const matchers = {
  toHavePerformedGraphQLOperation,
  toHavePerformedGraphQLQuery: toHavePerformedGraphQLOperation,
  toHavePerformedGraphQLMutation: toHavePerformedGraphQLOperation,
};

import {useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {
  gql,
  graphql,
  createGraphQLSchema,
  createGraphQLController,
  createGraphQLFiller,
  GraphQLController,
  GraphQLControllerCompletedRequests,
} from '@quilted/graphql/testing';
import type {
  GraphQLMock,
  GraphQLMockFunction,
  GraphQLMockObject,
  GraphQLFillerOptions,
  GraphQLFillerDetails,
  GraphQLFillerResolver,
  GraphQLFillerResolverContext,
  GraphQLFillerResolverMap,
  GraphQLControllerRequest,
} from '@quilted/graphql/testing';

import {GraphQLContext} from './context.tsx';

export type {
  GraphQLOperation,
  GraphQLOperationType,
  GraphQLAnyOperation,
  GraphQLData,
  GraphQLVariables,
  GraphQLDeepPartialData,
  GraphQLFetch,
  GraphQLFetchContext,
  GraphQLResult,
  GraphQLError,
  GraphQLVariableOptions,
  PickGraphQLType,
} from '@quilted/graphql';

export {
  gql,
  graphql,
  createGraphQLSchema,
  createGraphQLFiller,
  createGraphQLController,
  GraphQLController,
  GraphQLControllerCompletedRequests,
};

export type {
  GraphQLMock,
  GraphQLMockFunction,
  GraphQLMockObject,
  GraphQLFillerOptions,
  GraphQLFillerDetails,
  GraphQLFillerResolver,
  GraphQLFillerResolverContext,
  GraphQLFillerResolverMap,
  GraphQLControllerRequest,
};

export function TestGraphQL({
  children,
  controller,
}: PropsWithChildren<{controller?: GraphQLController}>) {
  const fetch = useMemo(
    () => (controller ?? createGraphQLController()).fetch,
    [controller],
  );

  return <GraphQLContext fetch={fetch}>{children}</GraphQLContext>;
}

import {useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {
  createGraphQLController,
  createGraphQLFiller,
  GraphQLController,
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

export {createGraphQLController, GraphQLController, createGraphQLFiller};

export type {
  GraphQLMock,
  GraphQLMockFunction,
  GraphQLMockObject,
  GraphQLFillerOptions,
  GraphQLFillerDetails,
  GraphQLFillerResolver,
  GraphQLFillerResolverContext,
  GraphQLFillerResolverMap,
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

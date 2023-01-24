import {useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {
  createGraphQLController,
  createGraphQLFiller,
  createGraphQLSchema,
  GraphQLController,
} from '@quilted/graphql/fixtures';
import type {
  GraphQLFillerOptions,
  GraphQLFillerDetails,
  GraphQLFillerResolver,
  GraphQLFillerResolverContext,
  GraphQLFillerResolverMap,
} from '@quilted/graphql/fixtures';

import {GraphQLContext} from './context';

export type {
  GraphQLOperation,
  GraphQLOperationType,
  GraphQLAnyOperation,
  GraphQLData,
  GraphQLVariables,
  GraphQLDeepPartialData,
  GraphQLFetch,
  GraphQLFetchContext,
  GraphQLMock,
  GraphQLMockFunction,
  GraphQLMockObject,
  GraphQLResult,
  GraphQLError,
  GraphQLVariableOptions,
  PickGraphQLType,
} from '@quilted/graphql';

export {
  createGraphQLController,
  GraphQLController,
  createGraphQLFiller,
  createGraphQLSchema,
};

export type {
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

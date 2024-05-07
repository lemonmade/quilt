import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';

import {
  gql,
  graphql,
  createGraphQLSchema,
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

export type * from '@quilted/graphql';

export {
  gql,
  graphql,
  createGraphQLSchema,
  createGraphQLFiller,
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

export function GraphQLTesting({
  children,
  controller,
}: RenderableProps<{controller?: GraphQLController}>) {
  const run = useMemo(
    () => (controller ?? new GraphQLController()).run,
    [controller],
  );

  return <GraphQLContext run={run}>{children}</GraphQLContext>;
}

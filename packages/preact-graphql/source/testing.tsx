import type {RenderableProps} from 'preact';
import {useContext, useMemo} from 'preact/hooks';

import type {GraphQLCache} from '@quilted/graphql';
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

import {QuiltFrameworkContextPreact} from '@quilted/preact-context';

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
  cache,
}: RenderableProps<{controller?: GraphQLController; cache?: GraphQLCache}>) {
  const run = useMemo(
    () => (controller ?? new GraphQLController()).run,
    [controller],
  );

  const existingContext = useContext(QuiltFrameworkContextPreact);
  const newContext = useMemo(
    () => ({...existingContext, graphql: {fetch: run, cache}}),
    [existingContext, run, cache],
  );

  return (
    <QuiltFrameworkContextPreact.Provider value={newContext}>
      {children}
    </QuiltFrameworkContextPreact.Provider>
  );
}

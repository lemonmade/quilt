import {useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {
  createGraphQLController,
  createFiller,
  createSchema,
  GraphQLController,
} from '@quilted/graphql/fixtures';
import type {
  GraphQLMock,
  GraphQLMockFunction,
  GraphQLMockObject,
} from '@quilted/graphql/fixtures';

import {GraphQLContext} from './context';

export {createGraphQLController, GraphQLController, createFiller, createSchema};
export type {GraphQLMock, GraphQLMockFunction, GraphQLMockObject};

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

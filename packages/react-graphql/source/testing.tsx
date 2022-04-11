import {useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {createGraphQL} from '@quilted/graphql';
import type {GraphQLFetch} from '@quilted/graphql';
import {createGraphQLController, createFiller} from '@quilted/graphql/fixtures';
import type {GraphQLController} from '@quilted/graphql/fixtures';

import {GraphQLContext} from './context';

export {createGraphQLController as createTestGraphQL, createFiller};
export type {GraphQLController};

export function TestGraphQL({
  children,
  controller,
}: PropsWithChildren<{controller?: GraphQLController}>) {
  const graphql = useMemo(
    () =>
      createGraphQL({fetch: toFetch(controller ?? createGraphQLController())}),
    [controller],
  );

  return (
    <GraphQLContext.Provider value={graphql}>
      {children}
    </GraphQLContext.Provider>
  );
}

function toFetch(controller: GraphQLController): GraphQLFetch {
  return ({operation, variables}) => {
    return controller.run<any, any>({
      operation,
      variables: variables as any,
    });
  };
}

import type {PropsWithChildren} from 'react';
import type {GraphQLFetch} from '@quilted/graphql';
import {createOptionalContext} from '@quilted/react-utilities';

export const GraphQLFetchContext = createOptionalContext<GraphQLFetch>();

export interface Props {
  fetch: GraphQLFetch;
}

export function GraphQLContext({fetch, children}: PropsWithChildren<Props>) {
  return (
    <GraphQLFetchContext.Provider value={fetch}>
      {children}
    </GraphQLFetchContext.Provider>
  );
}

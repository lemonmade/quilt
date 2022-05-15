import {createContext} from 'react';
import type {PropsWithChildren} from 'react';
import type {GraphQLFetch} from '@quilted/graphql';

export const GraphQLFetchContext = createContext<GraphQLFetch | undefined>(
  undefined,
);

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

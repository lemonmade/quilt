import {createContext} from 'react';
import type {PropsWithChildren} from 'react';
import type {GraphQL} from '@quilted/graphql';

export const GraphQLClientContext = createContext<GraphQL | undefined>(
  undefined,
);

export interface Props {
  client: GraphQL;
}

export function GraphQLContext({client, children}: PropsWithChildren<Props>) {
  return (
    <GraphQLClientContext.Provider value={client}>
      {children}
    </GraphQLClientContext.Provider>
  );
}

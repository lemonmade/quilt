import type {PropsWithChildren} from 'react';
import type {GraphQLRun} from '@quilted/graphql';
import {createOptionalContext} from '@quilted/react-utilities';

export const GraphQLRunContext = createOptionalContext<GraphQLRun>();

export interface Props {
  run?: GraphQLRun;
  fetch?: GraphQLRun;
}

export function GraphQLContext({
  run,
  fetch,
  children,
}: PropsWithChildren<Props>) {
  return (
    <GraphQLRunContext.Provider value={run ?? fetch}>
      {children}
    </GraphQLRunContext.Provider>
  );
}

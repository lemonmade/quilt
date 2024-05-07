import type {RenderableProps} from 'preact';
import type {GraphQLRun} from '@quilted/graphql';
import {createOptionalContext} from '@quilted/preact-context';

export const GraphQLRunContext = createOptionalContext<GraphQLRun>();

export interface Props {
  run?: GraphQLRun;
  fetch?: GraphQLRun;
}

export function GraphQLContext({run, fetch, children}: RenderableProps<Props>) {
  return (
    <GraphQLRunContext.Provider value={run ?? fetch}>
      {children}
    </GraphQLRunContext.Provider>
  );
}

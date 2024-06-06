import type {RenderableProps} from 'preact';
import type {GraphQLRun, GraphQLCache} from '@quilted/graphql';
import {createOptionalContext} from '@quilted/preact-context';
import {useAsyncActionCacheSerialization} from '@quilted/preact-async';

export const GraphQLRunContext = createOptionalContext<GraphQLRun>();
export const GraphQLCacheContext = createOptionalContext<GraphQLCache>();

export interface Props {
  run?: GraphQLRun;
  fetch?: GraphQLRun;
  cache?: GraphQLCache;
  serialize?: boolean;
}

export function GraphQLContext({
  run,
  fetch,
  cache,
  serialize = true,
  children,
}: RenderableProps<Props>) {
  if (cache && serialize) {
    useAsyncActionCacheSerialization(cache, {name: 'graphql'});
  }

  return (
    <GraphQLRunContext.Provider value={run ?? fetch}>
      <GraphQLCacheContext.Provider value={cache}>
        {children}
      </GraphQLCacheContext.Provider>
    </GraphQLRunContext.Provider>
  );
}

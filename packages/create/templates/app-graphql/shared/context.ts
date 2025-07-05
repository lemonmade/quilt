import {createOptionalContext} from '@quilted/quilt/context';
import type {Router} from '@quilted/quilt/navigation';
import type {GraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

export interface AppContext {
  readonly router: Router;
  readonly graphql: {
    readonly fetch: GraphQLFetch<any>;
    readonly cache: GraphQLCache;
  };
}

export const AppContextReact = createOptionalContext<AppContext>();
export const useAppContext = AppContextReact.use;

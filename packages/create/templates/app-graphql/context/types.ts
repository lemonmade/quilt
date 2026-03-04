import type {Navigation} from './navigation.ts';
import type {GraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

export interface AppContext {
  readonly navigation: Navigation;
  readonly graphql: {
    readonly fetch: GraphQLFetch;
    readonly cache: GraphQLCache;
  };
}

import type {GraphQLFetch} from '@quilted/quilt/graphql';
import type {AsyncActionCache} from '@quilted/quilt/async';

declare module '~/shared/context.ts' {
  interface AppContext {
    readonly fetchGraphQL: GraphQLFetch;
    readonly asyncCache: AsyncActionCache;
  }
}

export {};

import type {GraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

declare module '~/shared/context.ts' {
  interface AppContext {
    readonly graphql: {
      readonly fetch: GraphQLFetch;
      readonly cache: GraphQLCache;
    };
  }
}

export {};

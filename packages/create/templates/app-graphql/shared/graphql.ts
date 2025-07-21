import type {GraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

declare module '~/shared/context.ts' {
  interface AppContext {
    /**
     * The app’s GraphQL client.
     */
    readonly graphql: {
      /**
       * A function to perform GraphQL operations.
       */
      readonly fetch: GraphQLFetch;

      /**
       * The app’s GraphQL cache.
       */
      readonly cache: GraphQLCache;
    };
  }
}

export {};

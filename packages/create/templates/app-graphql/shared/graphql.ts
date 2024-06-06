import type {GraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

declare module '~/shared/context.ts' {
  interface AppContext {
    readonly fetchGraphQL: GraphQLFetch;
    readonly graphQLCache: GraphQLCache;
  }
}

export {};

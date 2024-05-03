import type {GraphQLFetch} from '@quilted/quilt/graphql';
import type {QueryClient} from '@tanstack/react-query';

declare module '~/shared/context.ts' {
  interface AppContext {
    queryClient: QueryClient;
    fetchGraphQL: GraphQLFetch;
  }
}

export {};

import type {GraphQLRun, GraphQLCache, GraphQLClient} from '@quilted/graphql';
import {useQuiltContext} from '@quilted/preact-context';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * The GraphQL client for this application. Provides the fetch function
     * used to execute GraphQL operations and an optional result cache for
     * deduplication and server-side rendering.
     *
     * Typically a `GraphQLClient` instance, but any object with `fetch` and
     * an optional `cache` property is accepted.
     *
     * @see GraphQLClient
     */
    readonly graphql?: Pick<GraphQLClient, 'fetch' | 'cache'>;
  }
}

export function useGraphQLRun(): GraphQLRun;
export function useGraphQLRun(options: {optional: boolean}): GraphQLRun | undefined;
export function useGraphQLRun(options?: {optional?: boolean}): GraphQLRun | undefined {
  const graphql = useQuiltContext('graphql', {optional: true});
  const run = graphql?.fetch;

  if (!options?.optional && run == null) {
    throw new Error(`Missing QuiltContext field: graphql.fetch`);
  }

  return run;
}

export function useGraphQLCache(): GraphQLCache;
export function useGraphQLCache(options: {optional: boolean}): GraphQLCache | undefined;
export function useGraphQLCache(options?: {optional?: boolean}): GraphQLCache | undefined {
  const graphql = useQuiltContext('graphql', {optional: true});
  const cache = graphql?.cache;

  if (!options?.optional && cache == null) {
    throw new Error(`Missing QuiltContext field: graphql.cache`);
  }

  return cache;
}

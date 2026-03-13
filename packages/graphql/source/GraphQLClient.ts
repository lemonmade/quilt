import type {GraphQLRun} from './types.ts';
import {GraphQLCache} from './GraphQLCache.ts';

/**
 * Bundles a GraphQL fetch function and an optional result cache into a
 * single object. Construct one with `new GraphQLClient(fetch)` — a cache
 * is created automatically and configured to use the same fetch function.
 *
 * Pass `{cache: false}` to disable caching, or pass an existing
 * `GraphQLCache` instance to share one across clients.
 *
 * @example
 * // Creates a client with a built-in cache
 * const client = new GraphQLClient(createGraphQLFetch({url: '/graphql'}));
 *
 * @example
 * // Shares a cache across multiple clients
 * const cache = new MyGraphQLCache();
 * const client = new GraphQLClient(myFetch, {cache});
 *
 * @example
 * // Disables caching entirely
 * const client = new GraphQLClient(myFetch, {cache: false});
 */
export class GraphQLClient {
  /**
   * The function used to execute GraphQL operations against your API.
   */
  readonly fetch: GraphQLRun;

  /**
   * The cache for GraphQL query results, used to deduplicate in-flight
   * requests and share data across components. `undefined` when caching
   * has been explicitly disabled with `{cache: false}`.
   */
  readonly cache: GraphQLCache | undefined;

  constructor(
    fetch: GraphQLRun,
    {cache = true}: {cache?: boolean | GraphQLCache} = {},
  ) {
    this.fetch = fetch;

    if (cache === true) {
      this.cache = new GraphQLCache({fetch});
    } else if (cache instanceof GraphQLCache) {
      this.cache = cache;
    } else {
      this.cache = undefined;
    }
  }
}

import {AsyncAction, type AsyncActionRunCache} from '@quilted/async';

import {createGraphQLFetch} from './fetch/fetch.ts';
import type {GraphQLResult, GraphQLAnyOperation, GraphQLRun} from './types.ts';

/**
 * Creates a wrapper around a GraphQL query. This wrapper can be used to run
 * the query multiple times, and to observe the status of the query’s results.
 */
export class GraphQLQuery<Data, Variables> extends AsyncAction<
  GraphQLResult<Data>,
  Variables
> {
  get result() {
    return this.value;
  }

  readonly fetch: GraphQLRun<any>;

  constructor(
    readonly operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createGraphQLFetch({url: '/graphql'}),
      cached,
    }: NoInfer<{
      /**
       * The function used to run the GraphQL query. If not provided,
       * a default `fetch` function will be used, which will run your
       * queries against a `/graphql` endpoint.
       */
      fetch?: GraphQLRun<any>;

      /**
       * An optional cached result to use for this query.
       */
      cached?: AsyncActionRunCache<GraphQLResult<Data>, Variables>;
    }> = {},
  ) {
    super(
      async (variables: Variables, {signal}) => {
        const result = await fetch(operation, {variables, signal});
        return result;
      },
      {cached},
    );

    this.fetch = fetch;
  }

  /**
   * Performs the GraphQL query with the provided variables.
   *
   * @alias GraphQLQuery#run()
   */
  query: typeof this.run = (...args) => this.run(...args);
}

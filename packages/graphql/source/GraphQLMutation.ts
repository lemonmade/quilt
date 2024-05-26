import {AsyncAction} from '@quilted/async';
import {createGraphQLFetch, type GraphQLFetch} from './fetch/fetch.ts';
import type {GraphQLResult, GraphQLAnyOperation} from './types.ts';

/**
 * Creates a wrapper around a GraphQL mutation. This wrapper can be used to run
 * the mutation multiple times, and to observe the status of the mutation’s results.
 */
export class GraphQLMutation<Data, Variables> extends AsyncAction<
  GraphQLResult<Data>,
  Variables
> {
  get result() {
    return this.value;
  }

  readonly fetch: GraphQLFetch;

  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createGraphQLFetch({url: '/graphql'}),
    }: {
      /**
       * The function used to run the GraphQL mutation. If not provided,
       * a default `fetch` function will be used, which will run your
       * queries against a `/graphql` endpoint.
       */
      fetch?: GraphQLFetch<any>;
    } = {},
  ) {
    super(async (variables: Variables, {signal}) => {
      const result = await fetch(operation, {variables, signal});
      return result;
    });

    this.fetch = fetch;
  }

  /**
   * Performs the GraphQL query with the provided variables.
   *
   * @alias GraphQLQuery#run()
   */
  query: typeof this.run = (...args) => this.run(...args);
}

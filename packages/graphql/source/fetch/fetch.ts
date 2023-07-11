import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

import {GraphQLFetchRequest} from './request.ts';

/**
 * Options for creating a `GraphQLFetch` function.
 */
export interface GraphQLHttpFetchOptions
  extends Pick<RequestInit, 'credentials'> {
  /**
   * The URL to send GraphQL requests to. This can be a `string`, a `URL`
   * object, or a function that returns either of those. If you provide
   * a function, it will be called with the `GraphQLOperation` that is
   * being performed, which allows you to customize the URL per operation.
   */
  url:
    | string
    | URL
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => string | URL);

  /**
   * The HTTP headers to send with GraphQL requests. This can be a an object
   * that can be used to construct a `Headers` instance, or a function that
   * returns such an object. If you provide a function, it will be called
   * with the `GraphQLOperation` that is being performed, which allows you
   * to customize the headers per operation.
   */
  headers?:
    | HeadersInit
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => HeadersInit);

  /**
   * The HTTP method to use for GraphQL requests. This can be an HTTP verb
   * (as a `string`) or a function that returns such a string. If you provide
   * a function, it will be called with the `GraphQLOperation` that is being
   * performed, which allows you to customize the headers per operation.
   */
  method?:
    | 'GET'
    | 'POST'
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => 'GET' | 'POST');

  /**
   * Customizes the `Request` that will be performed. This function is called
   * with the default `Request` object, and must return either an altered
   * `Request`, or a promise that resolves with an altered `Request`.
   */
  customizeRequest?<Data, Variables>(
    request: GraphQLFetchRequest<Data, Variables>,
  ): Request | Promise<Request>;
}

/**
 * The context used by HTTP-based `GraphQLFetch` functions.
 */
export interface GraphQLHttpFetchContext {
  /**
   * The `Response` that contained the GraphQL result.
   */
  response?: Response;
}

declare module '../types.ts' {
  interface GraphQLFetchContext extends GraphQLHttpFetchContext {}
}

/**
 * Creates a function that can fetch GraphQL queries and mutations over HTTP.
 * This function does not do any caching; it does the bare minimum required to
 * send GraphQL requests to a specific URL and return the parsed response.
 *
 * @example
 * const fetchGraphQL = createGraphQLHttpFetch({
 *   url: '/graphql',
 * });
 *
 * const {data, errors} = await fetchGraphQL(`
 *   query { my { name } }
 * `);
 */
export function createGraphQLHttpFetch<Extensions = Record<string, unknown>>({
  url,
  method,
  headers: explicitHeaders,
  credentials,
  customizeRequest,
}: GraphQLHttpFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options,
    context,
  ) {
    const variables = options?.variables as any;
    const resolvedOperation = toGraphQLOperation(operation);

    const resolvedUrl =
      typeof url === 'function' ? url(resolvedOperation) : url;

    const resolvedMethod =
      typeof method === 'function' ? method(resolvedOperation) : method;

    const headers =
      typeof explicitHeaders === 'function'
        ? explicitHeaders(resolvedOperation)
        : explicitHeaders;

    const graphqlRequest = new GraphQLFetchRequest(
      resolvedUrl,
      resolvedOperation,
      {
        variables,
        method: resolvedMethod,
        headers,
        credentials,
        signal: options?.signal,
      },
    );

    const request = customizeRequest
      ? await customizeRequest(graphqlRequest)
      : graphqlRequest;

    const response = await fetch(request);

    if (context) context.response = response;

    if (!response.ok) {
      return {
        errors: [
          {
            response,
            message: `GraphQL fetch failed with status: ${
              response.status
            }, response: ${await response.text()}`,
          },
        ],
      };
    }

    const {data, errors, extensions} = (await response.json()) as any;

    return {data, errors, extensions};
  };

  return fetchGraphQL;
}

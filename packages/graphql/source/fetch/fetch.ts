import {toGraphQLOperation} from '../operation.ts';
import type {
  GraphQLResult,
  GraphQLOperation,
  GraphQLAnyOperation,
  GraphQLOperationOptions,
} from '../types.ts';

import {GraphQLFetchRequest} from './request.ts';

/**
 * A function that can fetch GraphQL queries and mutations over HTTP.
 */
export interface GraphQLFetch<Extensions = {}> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLFetchOptions<Data, Variables>,
    context?: GraphQLFetchContext,
  ): Promise<GraphQLResult<Data, Extensions>>;
}

/**
 * Options for creating a `GraphQLFetch` function that performs GraphQL
 * operations over HTTP.
 */
export interface GraphQLFetchCreateOptions
  extends Pick<RequestInit, 'credentials'> {
  /**
   * A customized version of `fetch()` to use when making HTTP requests.
   * If this is not provided, the global `fetch` will be used.
   */
  fetch?: typeof fetch;

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
   * Additional metadata to send alongside your GraphQL request. This content will
   * be sent as the `extensions` request parameter.
   */
  extensions?:
    | Record<string, any>
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => Record<string, any>);

  /**
   * The HTTP headers to send with GraphQL requests. This can be an object
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
   * Overrides the operation source included in the GraphQL request.
   *
   * If this option is a string, it will be used as the operation source, regardless
   * of the `operation` provided to the `GraphQLFetchRequest` constructor.
   *
   * If this option is `false`, the operation source will not be sent as part
   * of the request. This may be used to implement "persisted queries", where
   * the operation is stored on the server, and the client sends only the
   * hash of the request.
   *
   * If this option is `true` or omitted, the operation source will be inferred
   * from the `operation` argument you provide.
   *
   * If this option is a function, it will be called with each `GraphQLOperation`,
   * and must return one of the other allowed return types.
   */
  source?:
    | string
    | boolean
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => string | boolean);

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
 * Options that can be passed to a single fetch of a GraphQL operation.
 */
export interface GraphQLFetchOptions<Data, Variables>
  extends GraphQLOperationOptions<Data, Variables>,
    Partial<GraphQLFetchCreateOptions> {}

/**
 * The context used by HTTP-based `GraphQLFetch` functions.
 */
export interface GraphQLFetchContext {
  /**
   * The `Request` that was made to the GraphQL HTTP server.
   */
  request?: Request;

  /**
   * The `Response` that contained the GraphQL result.
   */
  response?: Response;
}

const EMPTY_OBJECT = {} as any;

/**
 * Creates a function that can fetch GraphQL queries and mutations over HTTP.
 * This function does not do any caching; it does the bare minimum required to
 * send GraphQL requests to a specific URL and return the parsed response.
 *
 * @example
 * const fetchGraphQL = createGraphQLFetch({
 *   url: '/graphql',
 * });
 *
 * const {data, errors} = await fetchGraphQL(`
 *   query { my { name } }
 * `);
 */
export function createGraphQLFetch<Extensions = Record<string, unknown>>({
  url,
  method: defaultMethod,
  headers: defaultHeaders,
  source: defaultSource,
  extensions: defaultExtensions,
  credentials,
  customizeRequest,
  fetch: defaultFetch = globalThis.fetch,
}: GraphQLFetchCreateOptions) {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options = EMPTY_OBJECT,
    context,
  ) {
    const variables = options?.variables as any;
    const resolvedOperation = toGraphQLOperation(operation, {
      name: options?.operationName,
    });

    const fetchForOperation = options.fetch ?? defaultFetch;

    const urlForOperation = options.url ?? url;
    const resolvedUrl =
      typeof urlForOperation === 'function'
        ? urlForOperation(resolvedOperation)
        : urlForOperation;

    const methodForOperation = options.method ?? defaultMethod;
    const method =
      typeof methodForOperation === 'function'
        ? methodForOperation(resolvedOperation)
        : methodForOperation;

    const headersForOperation = options.headers ?? defaultHeaders;
    const headers =
      typeof headersForOperation === 'function'
        ? headersForOperation(resolvedOperation)
        : headersForOperation;

    const extensionsForOperation = options.extensions ?? defaultExtensions;
    const extensions =
      typeof extensionsForOperation === 'function'
        ? extensionsForOperation(resolvedOperation)
        : extensionsForOperation;

    const sourceForOperation = options.source ?? defaultSource;
    const source =
      typeof sourceForOperation === 'function'
        ? sourceForOperation(resolvedOperation)
        : sourceForOperation;

    const graphqlRequest = new GraphQLFetchRequest(
      resolvedUrl,
      resolvedOperation,
      {
        method,
        headers,
        credentials,
        source,
        variables,
        extensions,
        signal: options?.signal,
      },
    );

    const request = customizeRequest
      ? await customizeRequest(graphqlRequest)
      : graphqlRequest;

    if (context) context.request = request;

    const response = await fetchForOperation(request);

    if (context) context.response = response;

    if (!response.ok) {
      return {
        errors: [
          {
            message: `GraphQL fetch failed with status: ${
              response.status
            }, response: ${await response.text()}`,
          },
        ],
      };
    }

    return (await response.json()) as GraphQLResult<any, Extensions>;
  };

  return fetchGraphQL;
}

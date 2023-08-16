import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

import {GraphQLFetchRequest} from './request.ts';

/**
 * Options for creating a `GraphQLFetch` function.
 */
export interface GraphQLHttpFetchOptions
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

const EMPTY_OBJECT = {} as any;

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
  method: defaultMethod,
  headers: defaultHeaders,
  source: defaultSource,
  extensions: defaultExtensions,
  credentials,
  customizeRequest,
  fetch = globalThis.fetch,
}: GraphQLHttpFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options = EMPTY_OBJECT,
    context,
  ) {
    const variables = options?.variables as any;
    const resolvedOperation = toGraphQLOperation(operation);

    const resolvedUrl =
      options.url ?? (typeof url === 'function' ? url(resolvedOperation) : url);

    const method =
      options.method ??
      (typeof defaultMethod === 'function'
        ? defaultMethod(resolvedOperation)
        : defaultMethod);

    const headers =
      options.headers ??
      (typeof defaultHeaders === 'function'
        ? defaultHeaders(resolvedOperation)
        : defaultHeaders);

    const extensions =
      options.extensions ??
      (typeof defaultExtensions === 'function'
        ? defaultExtensions(resolvedOperation)
        : defaultExtensions);

    const source =
      options.source ??
      (typeof defaultSource === 'function'
        ? defaultSource(resolvedOperation)
        : defaultSource);

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

    return await response.json();
  };

  return fetchGraphQL;
}

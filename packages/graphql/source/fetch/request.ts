import {toGraphQLOperation} from '../operation.ts';
import type {
  GraphQLOperation,
  GraphQLAnyOperation,
  GraphQLVariableOptions,
} from '../types.ts';

const ACCEPT_HEADER = 'Accept';
const CONTENT_TYPE_HEADER = 'Content-Type';

/**
 * Options for creating a `GraphQLFetchRequest`.
 */
export type GraphQLFetchRequestInit<_Data, Variables> = RequestInit &
  GraphQLVariableOptions<Variables> & {
    /**
     * Additional metadata to send alongside your GraphQL request. This content will
     * be sent as the `extensions` request parameter.
     */
    extensions?: Record<string, any>;

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
     */
    source?: string | boolean;
  };

/**
 * A custom `Request` object that represents a GraphQL operation being
 * performed over HTTP. This object contains some details about the
 * operation being performed, and automatically provides default
 * headers and query parameters for the operation.
 *
 * @param url - the URL to send the request to, either as a `URL` instance or a string
 * @param operation - the GraphQL query or mutation to run
 * @param options - additional options for the request, including variables and
 * other options accepted by the `Request` constructor
 */
export class GraphQLFetchRequest<Data, Variables> extends Request {
  readonly variables?: Variables;
  readonly operation: GraphQLOperation<Data, Variables>;

  constructor(
    url: string | URL,
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      variables,
      source = true,
      extensions,
      ...init
    }: GraphQLFetchRequestInit<Data, Variables> = {},
  ) {
    const {method = 'POST', headers: headersInit, body} = init;

    let resolvedUrl = url;
    const headers = new Headers(headersInit);
    const requestOptions: RequestInit = {...init, method, headers};

    const resolvedOperation = toGraphQLOperation(operation);
    const resolvedName = resolvedOperation.name;
    const resolvedSource =
      typeof source === 'string'
        ? source
        : source
        ? resolvedOperation.source
        : undefined;

    const queryParameters: Record<string, any> = {};

    if (resolvedSource) queryParameters.query = resolvedSource;
    if (variables) queryParameters.variables = variables;
    if (extensions) queryParameters.extensions = extensions;
    if (resolvedName) queryParameters.operationName = resolvedName;

    if (method === 'GET') {
      let searchParams: URLSearchParams;

      if (typeof url === 'string') {
        searchParams = new URLSearchParams();
      } else {
        resolvedUrl = new URL(url);
        searchParams = resolvedUrl.searchParams;
      }

      for (const key in queryParameters) {
        const value = queryParameters[key];

        if (!value) continue;

        searchParams.set(
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
        );

        if (typeof url === 'string') {
          resolvedUrl = `${url}${
            url.includes('?') ? '&' : '?'
          }${searchParams.toString()}`;
        }
      }
    } else {
      requestOptions.body = body ?? JSON.stringify(queryParameters);
    }

    if (!headers.has(CONTENT_TYPE_HEADER)) {
      // @see https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md#media-types
      headers.set(CONTENT_TYPE_HEADER, 'application/json');
    }

    if (!headers.has(ACCEPT_HEADER)) {
      // @see https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md#media-types
      // @see https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md#legacy-watershed
      headers.append(ACCEPT_HEADER, 'application/graphql-response+json');
      headers.append(ACCEPT_HEADER, 'application/json');
    }

    super(resolvedUrl, requestOptions);

    this.variables = variables;
    this.operation = resolvedOperation;
  }
}

import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLOperation, GraphQLAnyOperation} from '../types.ts';

/**
 * Options for creating a `GraphQLFetchRequest`.
 */
export interface GraphQLFetchRequestInit<_Data, Variables> extends RequestInit {
  /**
   * The variables used for this GraphQL operation.
   */
  variables?: Variables;
}

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
    {variables, ...init}: GraphQLFetchRequestInit<Data, Variables> = {},
  ) {
    const {method = 'POST', headers: headersInit, body} = init;

    let resolvedUrl = url;
    const headers = new Headers(headersInit);
    const requestOptions: RequestInit = {...init, method, headers};

    const resolvedOperation = toGraphQLOperation(operation);

    if (method === 'GET') {
      resolvedUrl = new URL(url);
      resolvedUrl.searchParams.set('query', resolvedOperation.source);

      if (variables) {
        resolvedUrl.searchParams.set('variables', JSON.stringify(variables));
      }

      if (resolvedOperation.name) {
        resolvedUrl.searchParams.set('operationName', resolvedOperation.name);
      }
    } else {
      requestOptions.body =
        body ??
        JSON.stringify({
          query: resolvedOperation.source,
          variables,
          operationName: resolvedOperation.name,
        });
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    super(url, requestOptions);

    this.variables = variables;
    this.operation = resolvedOperation;
  }
}

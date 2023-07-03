import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLOperation, GraphQLAnyOperation} from '../types.ts';

export interface GraphQLFetchRequestInit<Data, Variables> extends RequestInit {
  operation: GraphQLAnyOperation<Data, Variables>;
  variables?: Variables;
}

export class GraphQLFetchRequest<Data, Variables> extends Request {
  readonly variables?: Variables;
  readonly operation: GraphQLOperation<Data, Variables>;

  constructor(
    url: string | URL,
    {operation, variables, ...init}: GraphQLFetchRequestInit<Data, Variables>,
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

import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLOperation, GraphQLAnyOperation} from '../types.ts';

export interface GraphQLFetchRequestInit<Data, Variables> extends RequestInit {
  operation: GraphQLAnyOperation<Data, Variables>;
  variables?: Variables;
}

export class GraphQLFetchRequest<Data, Variables> extends Request {
  readonly operation: GraphQLOperation<Data, Variables>;

  constructor(
    url: string | URL,
    {operation, variables, ...init}: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    let {body} = init;
    const {method = 'POST', headers: headersInit} = init;

    const headers = new Headers(headersInit);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const resolvedOperation = toGraphQLOperation(operation);

    body ??= JSON.stringify({
      query: resolvedOperation.source,
      variables,
      operationName: resolvedOperation.name,
    });

    super(url, {...init, method, headers, body});

    this.operation = resolvedOperation;
  }
}

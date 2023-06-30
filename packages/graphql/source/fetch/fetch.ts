import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

export interface GraphQLHttpFetchOptions
  extends Pick<RequestInit, 'credentials'> {
  url:
    | string
    | URL
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => string | URL);
  headers?:
    | HeadersInit
    | (<Data, Variables>(
        operation: GraphQLOperation<Data, Variables>,
      ) => Headers);
  customizeRequest?<Data, Variables>(
    request: Request,
    operation: GraphQLOperation<Data, Variables>,
  ): Request | Promise<Request>;
}

export interface GraphQLHttpFetchContext {
  response?: Response;
}

declare module '../types.ts' {
  interface GraphQLFetchContext {
    response?: Response;
  }
}

export function createGraphQLHttpFetch<Extensions = Record<string, unknown>>({
  url,
  headers: explicitHeaders,
  credentials,
  customizeRequest,
}: GraphQLHttpFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options,
    context,
  ) {
    const variables = options?.variables ?? {};
    const resolvedOperation = toGraphQLOperation(operation);

    const resolvedUrl =
      typeof url === 'function' ? url(resolvedOperation) : url;

    const headers =
      typeof explicitHeaders === 'function'
        ? explicitHeaders(resolvedOperation)
        : new Headers(explicitHeaders);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const requestInit: RequestInit = {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        query: resolvedOperation.source,
        variables,
        operationName: resolvedOperation.name,
      }),
    };

    if (credentials != null) requestInit.credentials = credentials;

    let request = new Request(resolvedUrl, requestInit);
    if (customizeRequest)
      request = await customizeRequest(request, resolvedOperation);

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

import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

export interface GraphQLHttpFetchOptions
  extends Pick<RequestInit, 'credentials'> {
  url: string | URL | ((operation: GraphQLOperation) => string | URL);
  headers?: HeadersInit | ((operation: GraphQLOperation) => Headers);
  customizeRequest?(
    request: Request,
    operation: GraphQLOperation,
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
  credentials,
  headers: explicitHeaders,
  customizeRequest,
}: GraphQLHttpFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options,
    context,
  ) {
    let id: string;
    let source: string;
    let operationName: string | undefined;
    const variables = options?.variables ?? {};

    if (typeof operation === 'string') {
      id = source = operation;
    } else if ('definitions' in operation) {
      id = source = operation.loc?.source.body ?? '';
      if (!source) {
        throw new Error(
          `Can’t determine source for document node: ${operation}`,
        );
      }
      operationName = operation.definitions[0]?.name?.value;
    } else {
      id = operation.id;
      source = operation.source;
      operationName = operation.name;
    }

    const resolvedOperation: GraphQLOperation = {
      id,
      source,
      name: operationName,
    };

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
        query: source,
        variables,
        operationName,
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

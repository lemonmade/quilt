import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

export interface GraphQLHttpFetchOptions
  extends Pick<RequestInit, 'credentials'> {
  url: string | URL | ((request: GraphQLOperation) => string | URL);
  headers?: Record<string, string> | ((headers: Headers) => Headers | void);
  customizeRequest?(request: Request): Request | Promise<Request>;
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

    const resolvedUrl =
      typeof url === 'function' ? url({id, source, name: operationName}) : url;

    let headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    if (typeof explicitHeaders === 'function') {
      headers = explicitHeaders(headers) ?? headers;
    } else if (explicitHeaders) {
      for (const header of Object.keys(explicitHeaders)) {
        headers.set(header, explicitHeaders[header]!);
      }
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
    if (customizeRequest) request = await customizeRequest(request);

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

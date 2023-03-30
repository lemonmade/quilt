import type {GraphQLFetch} from './types.ts';

export class GraphQLHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly response: string,
  ) {
    super(`GraphQL fetch failed with status: ${status}, response: ${response}`);
  }
}

export interface GraphQLHttpFetchOptions
  extends Pick<RequestInit, 'credentials'> {
  uri: string;
  headers?: Record<string, string>;
}

export interface GraphQLHttpFetchContext {
  response?: Response;
}

declare module './types' {
  interface GraphQLFetchContext {
    response?: Response;
  }
}

export function createGraphQLHttpFetch<Extensions = Record<string, unknown>>({
  uri,
  credentials,
  headers: explicitHeaders,
}: GraphQLHttpFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options,
    context,
  ) {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...explicitHeaders,
    });

    const request: RequestInit = {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        query: operation.source,
        variables: options?.variables ?? {},
        operationName: operation.name,
      }),
    };

    if (credentials != null) {
      request.credentials = credentials;
    }

    const response = await fetch(uri, request);

    if (context) context.response = response;

    if (!response.ok) {
      return {
        errors: [new GraphQLHttpError(response.status, await response.text())],
      };
    }

    return await response.json();
  };

  return fetchGraphQL;
}

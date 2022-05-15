import type {GraphQLFetch} from './types';

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

export function createGraphQLHttpFetch({
  uri,
  credentials,
  headers: explicitHeaders,
}: GraphQLHttpFetchOptions): GraphQLFetch {
  return async (operation, options, context) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...explicitHeaders,
    });

    const request: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: operation.source,
        variables: options.variables ?? {},
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
}

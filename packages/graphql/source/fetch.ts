import type {GraphQLError} from 'graphql';
import type {GraphQLFetch} from './types';

export class GraphQLHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly response: string,
  ) {
    super(`GraphQL fetch failed with status: ${status}, response: ${response}`);
  }
}

export class GraphQLExecutionError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    super(
      `GraphQL execution failed with errors: ${JSON.stringify(
        errors,
        null,
        2,
      )}`,
    );
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

export function createGraphQLHttpFetch({
  uri,
  credentials,
  headers: explicitHeaders,
}: GraphQLHttpFetchOptions): GraphQLFetch<GraphQLHttpFetchContext> {
  return async (operation, context) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...explicitHeaders,
    });

    const request: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: operation.operation.source,
        variables: operation.variables,
        operationName: operation.operation.name,
      }),
    };

    if (credentials != null) {
      request.credentials = credentials;
    }

    const response = await fetch(uri, request);

    context.set('response', response);

    if (!response.ok) {
      throw new GraphQLHttpError(response.status, await response.text());
    }

    const {data, errors} = (await response.json()) as {
      data?: Record<string, any>;
      errors?: GraphQLError[];
    };

    if (errors != null && errors.length > 0) {
      throw new GraphQLExecutionError(errors);
    }

    if (data == null) {
      throw new GraphQLExecutionError([
        {
          name: 'NoDataError',
          message: 'No data returned by GraphQL',
        } as any,
      ]);
    }

    return data!;
  };
}

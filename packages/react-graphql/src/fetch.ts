import type {GraphQLError} from 'graphql';

import type {GraphQLFetch} from './types';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly response: string,
  ) {
    super(`GraphQL fetch failed with status: ${status}, response: ${response}`);
  }
}

export class ExecutionError extends Error {
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

export interface HttpFetchOptions extends Pick<RequestInit, 'credentials'> {
  uri: string;
  headers?: {[key: string]: string};
}

export function createHttpFetch({
  uri,
  credentials,
  headers: explicitHeaders,
}: HttpFetchOptions): GraphQLFetch {
  return async (operation) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...explicitHeaders,
    });

    const response = await fetch(uri, {
      method: 'POST',
      credentials,
      headers,
      body: JSON.stringify({
        query: operation.document.source,
        variables: operation.variables,
        operationName: operation.document.name,
      }),
    });

    if (!response.ok) {
      throw new HttpError(response.status, await response.text());
    }

    const {data, errors} = (await response.json()) as {
      data?: object;
      errors?: GraphQLError[];
    };

    if (errors != null && errors.length > 0) {
      throw new ExecutionError(errors);
    }

    if (data == null) {
      throw new ExecutionError([
        {
          name: 'NoDataError',
          message: 'No data returned by GraphQL',
        } as any,
      ]);
    }

    return data!;
  };
}

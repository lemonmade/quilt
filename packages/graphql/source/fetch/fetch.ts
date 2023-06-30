import {toGraphQLOperation} from '../operation.ts';
import type {GraphQLFetch, GraphQLOperation} from '../types.ts';

import {GraphQLFetchRequest} from './request.ts';

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
      ) => HeadersInit);
  customizeRequest?<Data, Variables>(
    request: GraphQLFetchRequest<Data, Variables>,
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
    const variables = (options?.variables ?? {}) as any;
    const resolvedOperation = toGraphQLOperation(operation);

    const resolvedUrl =
      typeof url === 'function' ? url(resolvedOperation) : url;

    const headers =
      typeof explicitHeaders === 'function'
        ? explicitHeaders(resolvedOperation)
        : explicitHeaders;

    const graphqlRequest = new GraphQLFetchRequest(resolvedUrl, {
      headers,
      credentials,
      signal: options?.signal,
      operation: resolvedOperation,
      variables,
    });

    const request = customizeRequest
      ? await customizeRequest(graphqlRequest)
      : graphqlRequest;

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

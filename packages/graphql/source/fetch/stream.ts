import {toGraphQLOperation} from '../operation.ts';
import type {
  GraphQLResult,
  GraphQLAnyOperation,
  GraphQLStreamingFetchResult,
  GraphQLStreamingResult,
} from '../types.ts';

import {GraphQLFetchRequest} from './request.ts';
import type {
  GraphQLFetchOverHTTPOptions,
  GraphQLFetchOverHTTPContext,
  GraphQLFetchOverHTTPCreateOptions,
} from './fetch.ts';

/**
 * The context used by HTTP-based `GraphQLStreamingFetch` functions.
 */
export interface GraphQLStreamingFetchOverHTTPContext
  extends GraphQLFetchOverHTTPContext {}

/**
 * Options for creating a `GraphQLStreamingFetch` function.
 */
export interface GraphQLStreamingFetchOverHTTPCreateOptions
  extends GraphQLFetchOverHTTPCreateOptions {}

/**
 * Options that can be passed to a single fetch of a GraphQL operation.
 */
export interface GraphQLStreamingFetchOverHTTPOptions<Data, Variables>
  extends GraphQLFetchOverHTTPOptions<Data, Variables> {}

const STREAMING_OPERATION_REGEX = /@(stream|defer)\b/i;
const EMPTY_OBJECT = {} as any;

/**
 * Creates a function that can fetch GraphQL queries and mutations over HTTP,
 * including responses streamed in multiple parts for `@defer` and `@stream`
 * directives. This function does not do any caching; it does the bare minimum
 * required to send GraphQL requests to a specific URL and return the parsed response.
 *
 * The resulting function returns both a `Promise` and an `AsyncIterator`. As
 * incremental results are retrieved, they are pushed to the iterator. Once the
 * query or mutation has fully resolved (there are no more active `@defer` or
 * `@stream` directives), the iterator will be marked as done and the promise
 * will be resolved with the final, combined GraphQL result.
 *
 * @example
 * const fetchGraphQL = createGraphQLStreamingFetchOverHTTP({
 *   url: '/graphql',
 * });
 *
 * const fetched = fetchGraphQL(`
 *   query { my { name } }
 * `);
 *
 * for await (const {data, errors, incremental} of fetched) {
 *   // ...
 * }
 */
export function createGraphQLStreamingFetchOverHTTP<
  Extensions = Record<string, unknown>,
>({
  url,
  method: defaultMethod,
  headers: defaultHeaders,
  source: defaultSource,
  extensions: defaultExtensions,
  credentials,
  customizeRequest,
  fetch: defaultFetch = globalThis.fetch,
}: GraphQLStreamingFetchOverHTTPCreateOptions) {
  const fetchGraphQL = function fetchGraphQL<Data, Variables>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options: GraphQLStreamingFetchOverHTTPOptions<
      Data,
      Variables
    > = EMPTY_OBJECT,
    context?: GraphQLStreamingFetchOverHTTPContext,
  ) {
    let resolve: (value: GraphQLResult<Data, Extensions>) => void;
    let reject: (error: Error) => void;

    const unconsumedResults: any[] = [];
    const unconsumedPromises: {
      resolve(result: {value: any; done: boolean}): void;
      reject(error: any): void;
    }[] = [];

    let error: Error | null = null;
    let finished = false;

    const promise = new Promise<GraphQLResult<Data, Extensions>>(
      (promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      },
    ) as GraphQLStreamingFetchResult<Data, Extensions>;

    Object.defineProperties(promise, {
      next: {
        value: function next() {
          // First, we consume all unread events
          const value = unconsumedResults.shift();

          if (value) {
            return Promise.resolve({value, done: false});
          }

          // Then we error, if an error happened
          // This happens one time if at all, because after 'error'
          // we stop listening
          if (error) {
            const promise = Promise.reject(error);
            // Only the first element errors
            error = null;
            return promise;
          }

          // If the iterator is finished, resolve to done
          if (finished) {
            return Promise.resolve({value: undefined, done: true});
          }

          // Wait until an event happens
          return new Promise(function (resolve, reject) {
            unconsumedPromises.push({resolve, reject});
          });
        },
      },
      return: {
        value: function iteratorReturn() {
          finish();
          return Promise.resolve({value: undefined, done: true});
        },
      },

      throw: {
        value: function iteratorThrow(err: any) {
          error = err;
          return Promise.reject(error);
        },
      },

      [Symbol.asyncIterator]: {
        value: () => promise,
      },
    });

    run()
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });

    return promise;

    function finish() {
      finished = true;

      for (const promise of unconsumedPromises) {
        promise.resolve({value: undefined, done: true});
      }
    }

    async function run() {
      let lastResult: GraphQLResult<Data, Extensions> | null = null;

      try {
        const variables = options.variables;
        const resolvedOperation = toGraphQLOperation(operation);

        const fetchForOperation = options.fetch ?? defaultFetch;

        const urlForOperation = options.url ?? url;
        const resolvedUrl =
          typeof urlForOperation === 'function'
            ? urlForOperation(resolvedOperation)
            : urlForOperation;

        const methodForOperation = options.method ?? defaultMethod;
        const method =
          typeof methodForOperation === 'function'
            ? methodForOperation(resolvedOperation)
            : methodForOperation;

        const headersForOperation = options.headers ?? defaultHeaders;
        const headers =
          typeof headersForOperation === 'function'
            ? headersForOperation(resolvedOperation)
            : headersForOperation;

        const extensionsForOperation = options.extensions ?? defaultExtensions;
        const extensions =
          typeof extensionsForOperation === 'function'
            ? extensionsForOperation(resolvedOperation)
            : extensionsForOperation;

        const sourceForOperation = options.source ?? defaultSource;
        const source =
          typeof sourceForOperation === 'function'
            ? sourceForOperation(resolvedOperation)
            : sourceForOperation;

        const graphqlRequest = new GraphQLFetchRequest(
          resolvedUrl,
          resolvedOperation,
          {
            method,
            headers,
            credentials,
            source,
            variables,
            extensions,
            signal: options?.signal,
          },
        );

        if (STREAMING_OPERATION_REGEX.test(resolvedOperation.source)) {
          graphqlRequest.headers.append('Accept', 'multipart/mixed');
        }

        const request = customizeRequest
          ? await customizeRequest(graphqlRequest)
          : graphqlRequest;

        if (context) context.request = request;

        const response = await fetchForOperation(request);

        if (context) context.response = response;

        if (response.ok) {
          const contentType = response.headers.get('Content-Type');

          if (contentType?.includes('multipart/mixed')) {
            for await (const result of parseMultipartMixed<Data, Extensions>(
              response,
            )) {
              pushResult(result);
            }
          } else {
            pushResult(await response.json());
          }
        } else {
          pushResult({
            errors: [
              {
                message: `GraphQL fetch failed with status: ${
                  response.status
                }, response: ${await response.text()}`,
              },
            ],
          });
        }
      } catch (err) {
        finished = true;
        const toError = unconsumedPromises.shift();

        if (toError) {
          toError.reject(err);
        } else {
          // The next time we call next()
          error = err as any;
        }

        throw err;
      }

      finish();

      const {data, errors, extensions} =
        (lastResult as any as GraphQLResult<Data, Extensions>) ?? {};

      return {data, errors, extensions};

      function pushResult(result: GraphQLResult<Data, Extensions>) {
        if (finished) {
          return;
        }

        lastResult = result;

        const promise = unconsumedPromises.shift();

        if (promise) {
          promise.resolve({value: result, done: false});
        } else {
          unconsumedResults.push(result);
        }
      }
    }
  };

  return fetchGraphQL;
}

// Most of the content below was adapted from:
// https://github.com/urql-graphql/urql/blob/c074a504a05b690fff34212330a3eaa01ba4935c/packages/core/src/internal/fetchSource.ts

const BOUNDARY_HEADER_REGEX = /boundary="?([^=";]+)"?/i;
const NEWLINE_SEPARATOR = '\r\n';
const HEADER_SEPARATOR = NEWLINE_SEPARATOR + NEWLINE_SEPARATOR;

async function* parseMultipartMixed<Data, Extensions>(
  response: Response,
): AsyncIterableIterator<GraphQLStreamingResult<Data, Extensions>> {
  const boundaryHeader = (response.headers.get('Content-Type') ?? '').match(
    BOUNDARY_HEADER_REGEX,
  );

  const boundary = '--' + (boundaryHeader ? boundaryHeader[1] : '-');

  let isPreamble = true;
  let result: GraphQLStreamingResult<Data, Extensions> | undefined;

  for await (let chunk of splitChunksOnBoundary(
    streamResponseBody(response),
    NEWLINE_SEPARATOR + boundary,
  )) {
    if (isPreamble) {
      isPreamble = false;
      const preambleIndex = chunk.indexOf(boundary);

      if (preambleIndex > -1) {
        chunk = chunk.slice(preambleIndex + boundary.length);
      } else {
        continue;
      }
    }

    try {
      const newResult = JSON.parse(
        chunk.slice(chunk.indexOf(HEADER_SEPARATOR) + HEADER_SEPARATOR.length),
      );

      result = mergeResultPatch(result ?? {}, newResult);
      yield result;
    } catch (error) {
      if (!result) throw error;
    }

    if (result?.hasNext === false) break;
  }

  if (result && result.hasNext !== false) {
    yield {hasNext: false};
  }
}

async function* streamResponseBody(
  response: Response,
): AsyncIterableIterator<string> {
  const decoder = new TextDecoder();

  if ((response.body as any)![Symbol.asyncIterator]) {
    for await (const chunk of response.body! as any) {
      yield decoder.decode(chunk);
    }
  } else {
    let result: ReadableStreamReadResult<Uint8Array>;
    const reader = response.body!.getReader();

    try {
      while (!(result = await reader.read()).done) {
        yield decoder.decode(result.value);
      }
    } finally {
      reader.cancel();
    }
  }
}

async function* splitChunksOnBoundary(
  chunks: AsyncIterableIterator<string>,
  boundary: string,
) {
  let buffer = '';
  let boundaryIndex: number;

  for await (const chunk of chunks) {
    buffer += chunk;
    while ((boundaryIndex = buffer.indexOf(boundary)) > -1) {
      yield buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + boundary.length);
    }
  }
}

function mergeResultPatch<Data, Extensions>(
  result: GraphQLStreamingResult<Data, Extensions>,
  nextResult: GraphQLStreamingResult<Data, Extensions>,
): GraphQLStreamingResult<Data, Extensions> {
  const {incremental} = nextResult;

  if (incremental) {
    result.incremental = incremental;

    for (const patch of incremental) {
      if (Array.isArray(patch.errors)) {
        result.errors ??= [];
        (result.errors as any).push(...patch.errors);
      }

      if (patch.extensions) {
        result.extensions ??= {} as any;
        Object.assign(result.extensions as any, patch.extensions);
      }

      let prop: string | number = 'data';
      let part: any = result;
      for (let i = 0, l = patch.path.length; i < l; prop = patch.path[i++]!) {
        part = part[prop];
      }

      if (patch.items) {
        const startIndex = Math.max(
          0,
          typeof prop === 'number' ? prop : Number.parseInt(prop, 10),
        );

        for (let i = 0; i < patch.items.length; i++)
          part[startIndex + i] = deepMerge(
            part[startIndex + i],
            patch.items[i],
          );
      } else if (patch.data !== undefined) {
        part[prop] = deepMerge(part[prop], patch.data);
      }
    }
  } else {
    result.data = nextResult.data || result.data;
    result.errors = nextResult.errors || result.errors;
    result.incremental = nextResult.incremental;
  }

  if (nextResult.extensions) {
    result.extensions ??= {} as any;
    Object.assign(result.extensions as any, nextResult.extensions);
  }

  result.hasNext = nextResult.hasNext ?? result.hasNext;

  return result;
}

function deepMerge(target: any, source: any): any {
  if (
    typeof target === 'object' &&
    target != null &&
    (!target.constructor ||
      target.constructor === Object ||
      Array.isArray(target))
  ) {
    target = Array.isArray(target) ? [...target] : {...target};

    for (const key of Object.keys(source)) {
      target[key] = deepMerge(target[key], source[key]);
    }

    return target;
  }

  return source;
}

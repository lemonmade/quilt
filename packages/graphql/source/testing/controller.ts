import type {TypedQueryDocumentNode} from 'graphql';

import {normalizeOperation} from '../ast.ts';
import type {
  GraphQLAnyOperation,
  GraphQLFetch,
  GraphQLResult,
} from '../types.ts';

import type {GraphQLMock} from './types.ts';

/**
 * A single GraphQL request managed by the GraphQL controller.
 */
export interface GraphQLControllerRequest<Data, Variables> {
  /**
   * The name of the operation being performed.
   */
  name: string;

  /**
   * The parsed GraphQL document node for this request.
   */
  document: TypedQueryDocumentNode<Data, Variables>;

  /**
   * The variables used for this request.
   */
  variables: Variables;
}

/**
 * Options for finding a specific request being performed.
 */
interface GraphQLControllerFindOptions {
  /**
   * If provided, only operations matching the provided one will be
   * matched.
   */
  operation?: GraphQLAnyOperation<any, any>;
}

/**
 * Options for resolving a subset of in-progress GraphQL requests.
 */
interface GraphQLControllerResolveAllOptions {
  /**
   * If provided, only operations matching the provided one will be
   * resolved.
   */
  operation?: GraphQLAnyOperation<any, any>;

  /**
   * If `true`, GraphQL requests will continue to be resolved in a loop
   * until no more matching requests are pending.
   */
  untilEmpty?: boolean;
}

/**
 * Creates an object that can provide simulated GraphQL results. This
 * object is useful during testing and early development, as it allows
 * you to simulate GraphQL responses without needing to make requests
 * against a real server.
 *
 * @param mocks - The mock responses to use for this controller. The
 * best way to create these mocks is by using the `createGraphQLFiller()`
 * function, which can produce mocks that automatically fill in queries
 * and mutations with data matching the GraphQL schema.
 */
export function createGraphQLController(
  mocks: Iterable<GraphQLMock<any, any>>,
) {
  return new GraphQLController(mocks);
}

/**
 * An object that can provide simulated GraphQL results. This
 * object is useful during testing and early development, as it allows
 * you to simulate GraphQL responses without needing to make requests
 * against a real server.
 */
export class GraphQLController {
  /**
   * A list of GraphQL requests that have been completed by this controller.
   */
  readonly completed = new GraphQLControllerCompletedRequests();

  private readonly mocks = new Map<string, GraphQLMock<any, any>>();
  private readonly pending = new Map<string, Set<Promise<any>>>();

  constructor(mocks: Iterable<GraphQLMock<any, any>>) {
    this.mock(...mocks);
  }

  /**
   * Provides additional mock responses for this controller.
   */
  mock(...mocks: GraphQLMock<any, any>[]) {
    for (const mock of mocks) {
      const {name} = normalizeOperation(mock.operation);
      this.mocks.set(name, mock);
    }

    return this;
  }

  /**
   * Returns a promise that resolves after all inflight GraphQL requests
   * have finished resolving.
   *
   * @param options - An optional object containing options that control
   * which requests are waited on.
   */
  async resolveAll({
    operation,
    untilEmpty = true,
  }: GraphQLControllerResolveAllOptions = {}) {
    let matchingPending = extractPendingOperations(this.pending, operation);

    do {
      await Promise.all(matchingPending);
      matchingPending = untilEmpty
        ? extractPendingOperations(this.pending, operation)
        : [];
    } while (matchingPending.length > 0);
  }

  /**
   * Performs a GraphQL requests against the current mocks registered
   * with this controller.
   */
  fetch: GraphQLFetch = <Data, Variables>(...args: [any, any, any]) =>
    this.run<Data, Variables>(...args);

  /**
   * Performs a GraphQL requests against the current mocks registered
   * with this controller.
   */
  run: GraphQLFetch = <Data, Variables>(
    operation: GraphQLAnyOperation<Data, Variables>,
    {variables, signal}: {variables?: Variables; signal?: AbortSignal} = {},
  ) => {
    const {name, document} = normalizeOperation(operation);
    const mock: GraphQLMock<Data, Variables> | undefined = this.mocks.get(name);

    if (mock == null) {
      throw new Error(`No mock provided for operation ${JSON.stringify(name)}`);
    }

    let pending = this.pending.get(name);

    if (pending == null) {
      pending = new Set();
      this.pending.set(name, pending);
    }

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<GraphQLResult<Data>>(async (resolve) => {
      let result: any;

      try {
        result = await (typeof mock.result === 'function'
          ? (mock.result as any)({
              signal,
              variables: variables ?? ({} as any),
            })
          : mock.result);
      } catch (error) {
        result = error;
      }

      const response =
        result instanceof Error
          ? {data: null, errors: [result]}
          : {data: result};

      resolve(response);
    }).then((result) => {
      pending!.delete(promise);
      if (pending!.size === 0) this.pending.delete(name);

      this.completed.push({
        name,
        variables,
        document: document as any,
      });

      return result;
    });

    pending.add(promise);

    return promise;
  };
}

/**
 * A helper class that manages a list of completed GraphQL requests.
 */
export class GraphQLControllerCompletedRequests {
  private requests: GraphQLControllerRequest<unknown, unknown>[] = [];

  constructor(requests?: GraphQLControllerRequest<unknown, unknown>[]) {
    this.requests = requests ? [...requests] : [];
  }

  [Symbol.iterator]() {
    return this.requests[Symbol.iterator]();
  }

  /**
   * @internal
   */
  push(...requests: GraphQLControllerRequest<unknown, unknown>[]) {
    this.requests.push(...requests);
  }

  /**
   * Fetches all GraphQL requests that have been completed, optionally
   * filtered by the provided options.
   */
  all(options?: GraphQLControllerFindOptions) {
    return this.filterWhere(options);
  }

  /**
   * Fetches the first GraphQL requests that was completed, optionally
   * filtered by the provided options.
   */
  first(options?: GraphQLControllerFindOptions) {
    return this.nth(0, options);
  }

  /**
   * Fetches the last GraphQL requests that was completed, optionally
   * filtered by the provided options.
   */
  last(options?: GraphQLControllerFindOptions) {
    return this.nth(-1, options);
  }

  /**
   * Fetches the nth GraphQL requests that was completed, optionally
   * filtered by the provided options.
   */
  nth(
    index: number,
    options?: GraphQLControllerFindOptions,
  ): GraphQLControllerRequest<unknown, unknown> | undefined {
    const found = this.filterWhere(options);
    return index < 0 ? found[found.length + index] : found[index];
  }

  private filterWhere({operation}: GraphQLControllerFindOptions = {}) {
    const name = operation && normalizeOperation(operation).name;

    return name
      ? this.requests.filter((request) => request.name === name)
      : this.requests;
  }
}

function extractPendingOperations(
  pending: Map<string, Set<Promise<any>>>,
  operation?: GraphQLAnyOperation<any, any>,
) {
  if (operation == null) {
    return [...pending.values()].flatMap((pending) => [...pending]);
  }

  const {name} = normalizeOperation(operation);
  return [...(pending.get(name) ?? [])];
}

import {type TypedQueryDocumentNode} from 'graphql';

import {normalizeOperation} from '../ast.ts';
import type {
  GraphQLRun,
  GraphQLAnyOperation,
  GraphQLOperation,
  GraphQLResult,
} from '../types.ts';

import type {GraphQLMock} from './types.ts';

/**
 * A single GraphQL request managed by the GraphQL controller.
 */
export interface GraphQLControllerRequest<Data, Variables>
  extends GraphQLOperation<Data, Variables> {
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
export class GraphQLController {
  /**
   * A list of GraphQL requests that have been completed by this controller.
   */
  readonly completed = new GraphQLControllerCompletedRequests();

  private readonly mocks: (Pick<GraphQLMock<any, any>, 'result'> & {
    operation: GraphQLOperation<any, any>;
  })[] = [];
  private readonly pending = new Set<{
    request: GraphQLControllerRequest<any, any>;
    promise: Promise<any>;
  }>();

  constructor(mocks?: Iterable<GraphQLMock<any, any>>) {
    if (mocks) this.mock(...mocks);
  }

  /**
   * Provides additional mock responses for this controller.
   */
  mock(...mocks: GraphQLMock<any, any>[]) {
    for (const {operation, result} of mocks) {
      this.mocks.unshift({
        operation: normalizeOperation(operation),
        result,
      });
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
    const normalizedOperation = operation && normalizeOperation(operation);

    const getPendingRequests = () => {
      const pending: Promise<void>[] = [];

      for (const {request, promise} of this.pending) {
        if (
          normalizedOperation == null ||
          operationsMatch(request, normalizedOperation)
        ) {
          pending.push(promise);
        }
      }

      return pending;
    };

    let matchingPending = getPendingRequests();

    do {
      await Promise.all(matchingPending);
      matchingPending = untilEmpty ? getPendingRequests() : [];
    } while (matchingPending.length > 0);
  }

  /**
   * Performs a GraphQL requests against the current mocks registered
   * with this controller.
   */
  run: GraphQLRun = ((operation, {variables, signal} = {}) => {
    const normalizedOperation = normalizeOperation(operation);
    const request: GraphQLControllerRequest<any, any> = {
      ...normalizedOperation,
      variables: variables ?? ({} as any),
    };

    const mock: GraphQLMock<any, any> | undefined = this.mocks.find((mock) => {
      return operationsMatch(mock.operation, normalizedOperation);
    });

    if (mock == null) {
      throw new Error(
        `No mock provided for operation ${JSON.stringify(
          normalizedOperation.name ?? normalizedOperation.id,
        )}`,
      );
    }

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<GraphQLResult<any>>(async (resolve) => {
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
      this.pending.delete(pendingRequest);
      this.completed.push(request);

      return result;
    });

    const pendingRequest = {request, promise};
    this.pending.add(pendingRequest);

    return promise;
  }) satisfies GraphQLRun;

  /**
   * Performs a GraphQL request against the current mocks registered
   * with this controller.
   */
  fetch = this.run;

  /**
   * Performs a GraphQL query against the current mocks registered
   * with this controller.
   */
  query = this.run;

  /**
   * Performs a GraphQL query against the current mocks registered
   * with this controller.
   */
  mutate = this.run;
}

/**
 * A helper class that manages a list of completed GraphQL requests.
 */
export class GraphQLControllerCompletedRequests {
  private requests: GraphQLControllerRequest<unknown, unknown>[] = [];

  constructor(requests?: GraphQLControllerRequest<any, any>[]) {
    this.requests = requests ? [...requests] : [];
  }

  [Symbol.iterator]() {
    return this.requests[Symbol.iterator]();
  }

  /**
   * @internal
   */
  push(...requests: GraphQLControllerRequest<any, any>[]) {
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
    const normalizedOperation = operation && normalizeOperation(operation);

    return normalizedOperation
      ? this.requests.filter((request) =>
          operationsMatch(request, normalizedOperation),
        )
      : this.requests;
  }
}

function operationsMatch(
  one: GraphQLOperation<any, any>,
  two: GraphQLOperation<any, any>,
) {
  return one.id === two.id || one.source === two.source;
}

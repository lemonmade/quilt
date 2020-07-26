import {DocumentNode} from 'graphql';

import {normalizeOperation} from '../utilities/ast';
import type {
  GraphQLOperation,
  GraphQLMock,
  GraphQLAnyOperation,
} from '../types';

interface GraphQLAnyRequest<Data, Variables> {
  operation: DocumentNode | string | GraphQLOperation<Data, Variables>;
  variables?: Variables;
}

export interface GraphQLRequest<_Data, Variables> {
  name: string;
  operation: DocumentNode;
  variables: Variables;
}

interface Timing {
  delay: boolean | number;
}

interface FindOptions {
  operation?: GraphQLAnyOperation<any, any>;
}

interface ResolveAllOptions {
  operation?: GraphQLAnyOperation<any, any>;
  untilEmpty?: boolean;
}

export function createGraphQLController(...mocks: GraphQLMock<any, any>[]) {
  return new GraphQLController({mocks});
}

export class GraphQLController {
  readonly completed = new CompleteRequests();

  private readonly mocks = new Map<string, GraphQLMock<any, any>>();
  private readonly timings = new Map<string, Timing>();
  private readonly pending = new Map<string, (() => Promise<any>)[]>();

  constructor({mocks}: {mocks: GraphQLMock<any, any>[]}) {
    this.mock(...mocks);
  }

  timing(operation: GraphQLAnyOperation<any, any>, timing: Timing) {
    const name =
      typeof operation === 'string'
        ? operation
        : normalizeOperation(operation).name;

    if (timing.delay === 0) {
      this.timings.delete(name);
    } else {
      this.timings.set(name, timing);
    }

    return this;
  }

  mock(...mocks: GraphQLMock<any, any>[]) {
    for (const mock of mocks) {
      const {name} = normalizeOperation(mock.operation);
      this.mocks.set(name, mock);
    }

    return this;
  }

  async resolveAll({operation, untilEmpty = true}: ResolveAllOptions = {}) {
    let matchingPending = extractPendingOperations(this.pending, operation);

    do {
      await Promise.all(matchingPending.map((resolver) => resolver()));
      matchingPending = untilEmpty
        ? extractPendingOperations(this.pending, operation)
        : [];
    } while (matchingPending.length > 0);
  }

  async run<Data extends object, Variables extends object>({
    operation,
    variables,
  }: GraphQLAnyRequest<Data, Variables>): Promise<Data | Error> {
    const {name, document} = normalizeOperation(operation);
    const mock: GraphQLMock<Data, Variables> | undefined = this.mocks.get(name);

    if (mock == null) {
      throw new Error(`No mock provided for operation ${JSON.stringify(name)}`);
    }

    const promise = new Promise<Data | Error>((resolve) => {
      let hasRun = false;

      this.enqueue(name, () => {
        // This protects against a delayed resolution being called twice
        // if the user also manually ran all pending operations.
        if (hasRun) return promise;

        hasRun = true;

        let response: Data | Error;

        try {
          response = mock.result({
            variables: variables ?? ({} as any),
          });
        } catch (error) {
          response = error;
        }

        resolve(response);
        return promise;
      });
    }).then((result) => {
      this.completed.push({
        name,
        operation: document,
        variables,
      });

      return result;
    });

    return promise;
  }

  private enqueue(name: string, resolver: () => Promise<any>) {
    const timing = this.timings.get(name);
    const currentlyPending = this.pending.get(name) ?? [];
    this.pending.set(name, currentlyPending);
    currentlyPending.push(resolver);

    const delay = timing ? normalizeDelay(timing.delay) : 0;

    if (delay === 0) {
      setImmediate(resolver);
    } else if (Number.isFinite(delay)) {
      setTimeout(resolver, delay);
    }
  }
}

class CompleteRequests {
  private requests: GraphQLRequest<unknown, unknown>[] = [];

  constructor(requests?: GraphQLRequest<unknown, unknown>[]) {
    this.requests = requests ? [...requests] : [];
  }

  [Symbol.iterator]() {
    return this.requests[Symbol.iterator]();
  }

  push(...requests: GraphQLRequest<unknown, unknown>[]) {
    this.requests.push(...requests);
  }

  all(options?: FindOptions) {
    return this.filterWhere(options);
  }

  first(options?: FindOptions) {
    return this.nth(0, options);
  }

  last(options?: FindOptions) {
    return this.nth(-1, options);
  }

  nth(
    index: number,
    options?: FindOptions,
  ): GraphQLRequest<unknown, unknown> | undefined {
    const found = this.filterWhere(options);
    return index < 0 ? found[found.length + index] : found[index];
  }

  private filterWhere({operation}: FindOptions = {}) {
    const name = operation && normalizeOperation(operation).name;

    return name
      ? this.requests.filter((request) => request.name === name)
      : this.requests;
  }
}

function normalizeDelay(delay: boolean | number) {
  switch (delay) {
    case 0:
    case false:
      return 0;
    case true:
      return Number.POSITIVE_INFINITY;
    default:
      return delay;
  }
}

function extractPendingOperations(
  pending: Map<string, (() => Promise<any>)[]>,
  operation?: GraphQLAnyOperation<any, any>,
) {
  if (operation == null) {
    const allPending = [...pending.values()].flat();
    pending.clear();
    return allPending;
  }

  const {name} = normalizeOperation(operation);
  const pendingByName = pending.get(name) ?? [];
  pending.delete(name);
  return pendingByName;
}

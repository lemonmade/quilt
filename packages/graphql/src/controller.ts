import {parse, DocumentNode, OperationDefinitionNode} from 'graphql';

import type {GraphQLOperation} from './types';

interface GraphQLAnyRequest<Data, Variables> {
  operation: DocumentNode | string | GraphQLOperation<Data, Variables>;
  variables?: Variables;
}

interface GraphQLRequest<_Data, Variables> {
  operation: DocumentNode;
  variables: Variables;
}

type GraphQLMockResponse<Data extends object> = Error | Data;

type GraphQLMockFunction<Data extends object, Variables extends object> = (
  request: GraphQLRequest<Data, Variables>,
) => GraphQLMockResponse<Data>;

type GraphQLMock<Data extends object, Variables extends object> =
  | GraphQLMockResponse<Data>
  | GraphQLMockFunction<Data, Variables>;

interface GraphQLMockMap {
  [key: string]: GraphQLMock<any, any>;
}

interface Timing {
  delay: boolean | number;
}

interface FindOptions {}

export function createGraphQLController(mock?: GraphQLMockMap) {
  return new GraphQLController(mock);
}

export class GraphQLController {
  readonly completed = new CompleteRequests();

  private readonly mocks = new Map<string, GraphQLMock<any, any>>();
  private readonly timings = new Map<string, Timing>();
  private readonly pending = new Map<string, (() => Promise<any>)[]>();

  constructor(mockMap: GraphQLMockMap = {}) {
    for (const [name, mock] of Object.entries(mockMap)) {
      this.mocks.set(name, mock);
    }
  }

  timing(operation: string | GraphQLOperation | DocumentNode, timing: Timing) {
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

  mock<Data extends object, Variables extends object>(
    operation: string | GraphQLOperation<Data, Variables> | DocumentNode,
    mock: GraphQLMock<Data, Variables>,
    timing?: Timing,
  ) {
    const name =
      typeof operation === 'string'
        ? operation
        : normalizeOperation(operation).name;

    this.mocks.set(name, mock);

    if (timing) {
      this.timing(name, timing);
    }

    return this;
  }

  async resolveAll() {
    const allPending = [...this.pending.values()].flat();
    this.pending.clear();
    await Promise.all(allPending.map((resolver) => resolver()));
  }

  async run<Data extends object, Variables extends object>({
    operation,
    variables,
  }: GraphQLAnyRequest<Data, Variables>): Promise<Data | Error> {
    const {name, document} = normalizeOperation(operation);
    const mock: GraphQLMock<Data, Variables> = this.mocks.get(name);

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
          if (typeof mock === 'function') {
            response = (mock as GraphQLMockFunction<Data, Variables>)({
              operation: document,
              variables: variables ?? ({} as any),
            });
          } else {
            response = mock;
          }
        } catch (error) {
          response = error;
        }

        resolve(response);
        return promise;
      });
    }).then((result) => {
      this.completed.push({
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

  all(options?: FindOptions): GraphQLRequest<unknown, unknown>[] {
    return this.filterWhere(options);
  }

  first(options?: FindOptions): GraphQLRequest<unknown, unknown> | undefined {
    return this.nth(0, options);
  }

  last(options?: FindOptions): GraphQLRequest<unknown, unknown> | undefined {
    return this.nth(-1, options);
  }

  nth(index: number, options?: FindOptions) {
    const found = this.filterWhere(options);
    return index < 0 ? found[found.length + index] : found[index];
  }

  private filterWhere(_options: FindOptions = {}) {
    // const finalOperationName = operationNameFromFindOptions(options);

    // return finalOperationName
    //   ? this.requests.filter(({query: {name}}) => name === finalOperationName)
    //   : this.requests;

    return this.requests;
  }
}

function normalizeOperation(
  operation: string | GraphQLOperation | DocumentNode,
) {
  if (typeof operation === 'string') {
    const document = parse(operation);
    return {document, name: getFirstOperationNameFromDocument(document)};
  } else if ('source' in operation) {
    const document = parse(operation.source);
    return {
      document,
      name: operation.name ?? getFirstOperationNameFromDocument(document),
    };
  } else {
    return {
      document: operation,
      name: getFirstOperationNameFromDocument(operation),
    };
  }
}

function getFirstOperationNameFromDocument(document: DocumentNode) {
  const operation = document.definitions.find(
    (definition) => definition.kind === 'OperationDefinition',
  ) as OperationDefinitionNode | undefined;

  if (operation?.name?.value == null) {
    throw new Error(
      `No named operation found in document ${
        document.loc?.source.body ?? JSON.stringify(document, null, 2)
      }`,
    );
  }

  return operation.name.value;
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

import {signal} from '@quilted/signals';

export interface AsyncFetchCallResult<Data = unknown, Input = unknown> {
  readonly value?: Data;
  readonly error?: unknown;
  readonly input?: Input;
}

export interface AsyncFetchFunction<Data = unknown, Input = unknown> {
  (
    input: Input,
    options: {
      signal?: AbortSignal;
    },
  ): PromiseLike<Data>;
}

export class AsyncFetch<Data = unknown, Input = unknown> {
  get status() {
    return this.finishedSignal.value?.status ?? 'pending';
  }

  get value() {
    return this.finishedSignal.value?.value;
  }

  get error() {
    return this.finishedSignal.value?.error;
  }

  get promise(): AsyncFetchPromise<Data, Input> {
    return (
      this.runningSignal.value?.promise ??
      this.finishedSignal.value?.promise ??
      this.initial.promise
    );
  }

  get running() {
    return this.runningSignal.value;
  }

  get isRunning() {
    return this.runningSignal.value != null;
  }

  get finished() {
    return this.finishedSignal.value;
  }

  private readonly runningSignal = signal<
    AsyncFetchCall<Data, Input> | undefined
  >(undefined);
  private readonly finishedSignal = signal<
    AsyncFetchCall<Data, Input> | undefined
  >(undefined);
  private readonly function: AsyncFetchFunction<Data, Input>;
  private readonly initial: AsyncFetchCall<Data, Input>;

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {initial}: {initial?: AsyncFetchCallResult<Data, Input>} = {},
  ) {
    this.function = fetchFunction;
    this.initial = new AsyncFetchCall(fetchFunction, initial);
  }

  call = (
    input?: Input,
    {signal}: {signal?: AbortSignal} = {},
  ): AsyncFetchPromise<Data, Input> => {
    const wasRunning = this.runningSignal.peek();

    const fetchCall =
      wasRunning == null &&
      this.finishedSignal.peek() == null &&
      !this.initial.signal.aborted
        ? this.initial
        : new AsyncFetchCall(this.function);

    const finalizeFetchCall = () => {
      if (this.runningSignal.peek() === fetchCall) {
        this.runningSignal.value = undefined;
      }

      this.finishedSignal.value = fetchCall;
    };

    fetchCall.call(input, {signal}).then(finalizeFetchCall, finalizeFetchCall);

    this.runningSignal.value = fetchCall;
    wasRunning?.abort();

    return fetchCall.promise;
  };
}

export class AsyncFetchCall<Data = unknown, Input = unknown> {
  readonly promise: AsyncFetchPromise<Data, Input>;
  readonly function: AsyncFetchFunction<Data, Input>;
  readonly input?: Input;

  get signal() {
    return this.abortController.signal;
  }

  get isRunning() {
    return this.runningSignal.value;
  }

  get status() {
    return this.promise.status;
  }

  get value() {
    return this.promise.status === 'fulfilled' ? this.promise.value : undefined;
  }

  get error() {
    return this.promise.status === 'rejected' ? this.promise.reason : undefined;
  }

  private readonly resolve: (value: Data) => void;
  private readonly reject: (cause: unknown) => void;
  private readonly abortController = new AbortController();
  private readonly runningSignal = signal(false);

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    initial?: AsyncFetchCallResult<Data, Input>,
  ) {
    this.function = fetchFunction;

    let resolve!: (value: Data) => void;
    let reject!: (cause: unknown) => void;

    this.promise = new AsyncFetchPromise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    Object.assign(this.promise, {source: this});

    this.resolve = resolve;
    this.reject = reject;

    if (initial) {
      this.input = initial.input!;

      if (initial.error) {
        this.reject(initial.error);
      } else {
        this.resolve(initial.value!);
      }
    }
  }

  abort = () => {
    this.abortController.abort();
  };

  call = (input?: Input, {signal}: {signal?: AbortSignal} = {}) => {
    if (this.runningSignal.peek() || this.signal.aborted) {
      return Promise.reject(new Error(`Can’t perform fetch()`));
    }

    Object.assign(this, {input});

    signal?.addEventListener('abort', () => {
      this.abortController.abort();
    });

    Promise.resolve()
      .then(() => this.function(input!, {signal: this.abortController.signal}))
      .then(this.resolve, this.reject);

    return this.promise;
  };

  serialize(): AsyncFetchCallResult<Data, Input> | undefined {
    if (this.promise.status === 'pending') return;

    return {
      value: this.value,
      error: this.error,
      input: this.input,
    };
  }
}

export class AsyncFetchPromise<
  Data = unknown,
  Input = unknown,
> extends Promise<Data> {
  readonly status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  readonly value?: Data;
  readonly reason?: unknown;
  readonly source?: AsyncFetchCall<Data, Input>;

  constructor(executor: ConstructorParameters<typeof Promise<Data>>[0]) {
    super((resolve, reject) => {
      executor(
        (value) => {
          Object.assign(this, {status: 'fulfilled', value});
          resolve(value);
        },
        (reason) => {
          Object.assign(this, {status: 'rejected', reason});
          reject(reason);
        },
      );
    });
  }
}

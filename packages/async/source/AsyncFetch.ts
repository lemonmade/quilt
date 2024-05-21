import {signal} from '@quilted/signals';

export interface AsyncFetchFunction<Data = unknown, Input = unknown> {
  (
    input: Input,
    options: {
      signal?: AbortSignal;
    },
  ): PromiseLike<Data>;
}

export interface AsyncFetchCallCache<Data = unknown, Input = unknown> {
  readonly value?: Data;
  readonly error?: unknown;
  readonly input?: Input;
}

export class AsyncFetch<Data = unknown, Input = unknown> {
  get value() {
    return this.finishedSignal.value?.value;
  }

  get data() {
    return this.value;
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

  get status() {
    return this.finishedSignal.value?.status ?? 'pending';
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

  get hasFinished() {
    return this.finishedSignal.value != null;
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
    {cached}: {cached?: AsyncFetchCallCache<Data, Input>} = {},
  ) {
    this.function = fetchFunction;
    this.initial = new AsyncFetchCall(fetchFunction, cached);
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

      if (!fetchCall.signal.aborted) {
        this.finishedSignal.value = fetchCall;
      }
    };

    fetchCall.run(input, {signal}).then(finalizeFetchCall, finalizeFetchCall);

    this.runningSignal.value = fetchCall;
    wasRunning?.abort();

    return fetchCall.promise;
  };
}

export class AsyncFetchCall<Data = unknown, Input = unknown> {
  readonly promise: AsyncFetchPromise<Data, Input>;
  readonly function: AsyncFetchFunction<Data, Input>;
  readonly cached: boolean;
  readonly input?: Input;
  readonly startedAt?: number;
  readonly finishedAt?: number;

  get value() {
    return this.promise.status === 'fulfilled' ? this.promise.value : undefined;
  }

  get data() {
    return this.value;
  }

  get error() {
    return this.promise.status === 'rejected' ? this.promise.reason : undefined;
  }

  get signal() {
    return this.abortController.signal;
  }

  get status() {
    return this.promise.status;
  }

  get isRunning() {
    return this.startedAt != null && this.promise.status === 'pending';
  }

  get hasFinished() {
    return this.promise.status !== 'pending';
  }

  private readonly resolve: (value: Data) => void;
  private readonly reject: (cause: unknown) => void;
  private readonly abortController = new AbortController();

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    cached?: AsyncFetchCallCache<Data, Input>,
  ) {
    this.function = fetchFunction;

    let resolve!: (value: Data) => void;
    let reject!: (cause: unknown) => void;

    this.promise = new AsyncFetchPromise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    Object.assign(this.promise, {source: this});

    this.resolve = (value) => {
      if (this.promise.status !== 'pending') return;
      Object.assign(this, {finishedAt: now()});
      return resolve(value);
    };
    this.reject = (reason) => {
      if (this.promise.status !== 'pending') return;
      Object.assign(this, {finishedAt: now()});
      reject(reason);
    };

    this.cached = Boolean(cached);

    if (cached) {
      Object.assign(this, {
        input: cached.input,
        startAt: now(),
      });

      if (cached.error) {
        this.reject(cached.error);
      } else {
        this.resolve(cached.value!);
      }
    } else {
      const {signal} = this.abortController;

      signal.addEventListener(
        'abort',
        () => {
          this.reject(signal.reason);
        },
        {once: true},
      );
    }
  }

  abort = (reason?: any) => {
    this.abortController.abort(reason);
  };

  run = (input?: Input, {signal}: {signal?: AbortSignal} = {}) => {
    if (this.startedAt != null) return this.promise;

    Object.assign(this, {startedAt: now(), input});

    if (signal?.aborted) {
      this.abortController.abort();
      return this.promise;
    }

    signal?.addEventListener('abort', () => {
      this.abortController.abort();
    });

    try {
      Promise.resolve(
        this.function(input!, {signal: this.abortController.signal}),
      ).then(this.resolve, this.reject);
    } catch (error) {
      Promise.resolve().then(() => this.reject(error));
    }

    return this.promise;
  };

  serialize(): AsyncFetchCallCache<Data, Input> | undefined {
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
          if (this.status !== 'pending') return;
          Object.assign(this, {status: 'fulfilled', value});
          resolve(value);
        },
        (reason) => {
          if (this.status !== 'pending') return;
          Object.assign(this, {status: 'rejected', reason});
          reject(reason);
        },
      );
    });
  }
}

function now() {
  return typeof performance === 'object' ? performance.now() : Date.now();
}

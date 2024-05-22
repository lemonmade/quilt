import {signal} from '@quilted/signals';

export type AsyncFetchStatus = 'pending' | 'resolved' | 'rejected';

export interface AsyncFetchFunction<Data = unknown, Input = unknown> {
  (
    input: Input,
    options: {
      signal: AbortSignal;
    },
  ): PromiseLike<Data>;
}

export interface AsyncFetchCallCache<Data = unknown, Input = unknown> {
  readonly value?: Data;
  readonly error?: unknown;
  readonly input?: Input;
  readonly time?: number;
}

export class AsyncFetch<Data = unknown, Input = unknown> {
  get value() {
    return this.finished?.value;
  }

  get data() {
    return this.value;
  }

  get error() {
    return this.finished?.error;
  }

  get status() {
    return this.finished?.status ?? 'pending';
  }

  readonly initial: AsyncFetchCall<Data, Input>;

  get running() {
    return this.latestCalls.value.running;
  }

  get isRunning() {
    return this.running != null;
  }

  get finished() {
    return this.latestCalls.value.finished;
  }

  get hasFinished() {
    return this.finished != null;
  }

  get latest() {
    const {running, finished} = this.latestCalls.value;
    return running ?? finished ?? this.initial;
  }

  get promise(): AsyncFetchPromise<Data, Input> {
    return this.latest.promise;
  }

  get startedAt() {
    return this.latest.startedAt;
  }

  get finishedAt() {
    return this.finished?.startedAt;
  }

  get updatedAt() {
    return this.latest.updatedAt;
  }

  private readonly latestCalls = signal<{
    readonly finished?: AsyncFetchCall<Data, Input>;
    readonly running?: AsyncFetchCall<Data, Input>;
  }>({});
  private readonly function: AsyncFetchFunction<Data, Input>;
  private hasRun = false;

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {cached}: {cached?: AsyncFetchCallCache<Data, Input>} = {},
  ) {
    this.function = fetchFunction;
    this.initial = new AsyncFetchCall(fetchFunction, {
      cached,
      finally: this.finalizeFetchCall,
    });
  }

  fetch = (
    input?: Input,
    {signal}: {signal?: AbortSignal} = {},
  ): AsyncFetchPromise<Data, Input> => {
    const wasRunning = this.latestCalls.peek().running;

    const fetchCall =
      !this.hasRun && !this.initial.signal.aborted
        ? this.initial
        : new AsyncFetchCall(this.function, {
            finally: this.finalizeFetchCall,
          });

    this.hasRun = true;
    fetchCall.run(input, {signal});

    this.latestCalls.value = {...this.latestCalls.peek(), running: fetchCall};
    wasRunning?.abort();

    return fetchCall.promise;
  };

  refetch = ({signal}: {signal?: AbortSignal} = {}) =>
    this.fetch(this.latest.input, {signal});

  private finalizeFetchCall = (fetchCall: AsyncFetchCall<Data, Input>) => {
    let updated:
      | {
          -readonly [K in keyof typeof this.latestCalls.value]: (typeof this.latestCalls.value)[K];
        }
      | undefined;

    if (!fetchCall.signal.aborted) {
      updated = {...this.latestCalls.peek()};
      updated.finished = fetchCall;
    }

    if (this.latestCalls.peek() === fetchCall) {
      updated ??= {...this.latestCalls.peek()};
      delete updated.running;
    }

    if (updated) this.latestCalls.value = updated;
  };
}

export class AsyncFetchCall<Data = unknown, Input = unknown> {
  readonly promise: AsyncFetchPromise<Data, Input>;
  readonly function: AsyncFetchFunction<Data, Input>;
  readonly cached: boolean;
  readonly input?: Input;

  get value() {
    return this.promise.status === 'resolved' ? this.promise.value : undefined;
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

  readonly startedAt?: number;
  readonly finishedAt?: number;

  get updatedAt() {
    return this.finishedAt ?? this.startedAt;
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
    {
      cached,
      finally: onFinally,
    }: {
      cached?: AsyncFetchCallCache<Data, Input>;
      finally?(call: AsyncFetchCall<Data, Input>): void;
    } = {},
  ) {
    this.function = fetchFunction;

    let resolve!: (value: Data) => void;
    let reject!: (reason: unknown) => void;

    this.promise = new AsyncFetchPromise((res, rej) => {
      resolve = res;
      reject = rej;
    }, this);

    if (onFinally) {
      this.promise.then(
        () => onFinally(this),
        () => onFinally(this),
      );
    }

    this.resolve = (value) => {
      if (this.promise.status !== 'pending') return;
      if (!this.finishedAt) Object.assign(this, {finishedAt: now()});
      resolve(value);
    };
    this.reject = (reason) => {
      if (this.promise.status !== 'pending') return;
      if (!this.finishedAt) Object.assign(this, {finishedAt: now()});
      reject(reason);
    };

    this.cached = Boolean(cached);

    if (cached) {
      const finishedAt = cached.time ?? now();
      Object.assign(this, {
        input: cached.input,
        startedAt: finishedAt,
        finishedAt,
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
      this.abortController.abort(signal.reason);
      return this.promise;
    }

    signal?.addEventListener('abort', () => {
      this.abortController.abort(signal.reason);
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
      time: this.updatedAt,
    };
  }
}

export class AsyncFetchPromise<
  Data = unknown,
  Input = unknown,
> extends Promise<Data> {
  readonly status: AsyncFetchStatus = 'pending';
  readonly value?: Data;
  readonly reason?: unknown;
  readonly source: AsyncFetchCall<Data, Input>;

  constructor(
    executor: ConstructorParameters<typeof Promise<Data>>[0],
    source: AsyncFetchCall<Data, Input>,
  ) {
    super((resolve, reject) => {
      executor(
        (value) => {
          if (this.status !== 'pending') return;
          Object.assign(this, {status: 'resolved', value});
          resolve(value);
        },
        (reason) => {
          if (this.status !== 'pending') return;
          Object.assign(this, {status: 'rejected', reason});
          reject(reason);
        },
      );
    });
    this.source = source;
  }
}

function now() {
  return typeof performance === 'object'
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

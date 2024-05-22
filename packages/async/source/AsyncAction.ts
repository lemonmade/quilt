import {signal} from '@quilted/signals';

export type AsyncActionStatus = 'pending' | 'resolved' | 'rejected';

export interface AsyncActionFunction<Data = unknown, Input = unknown> {
  (
    input: Input,
    options: {
      readonly signal: AbortSignal;
      yield(data: Data): void;
    },
  ): PromiseLike<Data>;
}

export interface AsyncActionRunCache<Data = unknown, Input = unknown> {
  readonly value?: Data;
  readonly error?: unknown;
  readonly input?: Input;
  readonly time?: number;
}

export class AsyncAction<Data = unknown, Input = unknown> {
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

  readonly initial: AsyncActionRun<Data, Input>;

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

  readonly function: AsyncActionFunction<Data, Input>;

  get promise(): AsyncActionPromise<Data, Input> {
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
    readonly finished?: AsyncActionRun<Data, Input>;
    readonly running?: AsyncActionRun<Data, Input>;
  }>({});
  private hasRun = false;

  constructor(
    fetchFunction: AsyncActionFunction<Data, Input>,
    {cached}: {cached?: AsyncActionRunCache<Data, Input>} = {},
  ) {
    this.function = fetchFunction;
    this.initial = new AsyncActionRun(this, {
      cached,
      finally: this.finalizeAction,
    });
  }

  run = (
    input?: Input,
    {signal}: {signal?: AbortSignal} = {},
  ): AsyncActionPromise<Data, Input> => {
    const wasRunning = this.latestCalls.peek().running;

    const actionRun =
      !this.hasRun && !this.initial.signal.aborted
        ? this.initial
        : new AsyncActionRun(this, {
            finally: this.finalizeAction,
          });

    this.hasRun = true;
    actionRun.start(input, {signal});

    this.latestCalls.value = {...this.latestCalls.peek(), running: actionRun};
    wasRunning?.abort();

    return actionRun.promise;
  };

  rerun = ({signal}: {signal?: AbortSignal} = {}) =>
    this.run(this.latest.input, {signal});

  private finalizeAction = (actionRun: AsyncActionRun<Data, Input>) => {
    let updated:
      | {
          -readonly [K in keyof typeof this.latestCalls.value]: (typeof this.latestCalls.value)[K];
        }
      | undefined;

    if (!actionRun.signal.aborted) {
      updated = {...this.latestCalls.peek()};
      updated.finished = actionRun;
    }

    const latest = this.latestCalls.peek();
    if (latest.running === actionRun) {
      updated ??= {...latest};
      delete updated.running;
    }

    if (updated) this.latestCalls.value = updated;
  };
}

export class AsyncActionRun<Data = unknown, Input = unknown> {
  readonly promise: AsyncActionPromise<Data, Input>;
  readonly action: AsyncAction<Data, Input>;
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
    action: AsyncAction<Data, Input>,
    {
      cached,
      finally: onFinally,
    }: {
      cached?: AsyncActionRunCache<Data, Input>;
      finally?(call: AsyncActionRun<Data, Input>): void;
    } = {},
  ) {
    this.action = action;

    let resolve!: (value: Data) => void;
    let reject!: (reason: unknown) => void;

    this.promise = new AsyncActionPromise((res, rej) => {
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

  start = (input?: Input, {signal}: {signal?: AbortSignal} = {}) => {
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
      const {signal} = this.abortController;

      Promise.resolve(
        this.action.function(input!, {
          signal,
          yield: (value) => {
            if (signal.aborted) return;
            Object.assign(this, {value});
          },
        }),
      ).then(this.resolve, this.reject);
    } catch (error) {
      Promise.resolve().then(() => this.reject(error));
    }

    return this.promise;
  };

  serialize(): AsyncActionRunCache<Data, Input> | undefined {
    if (this.promise.status === 'pending') return;

    return {
      value: this.value,
      error: this.error,
      input: this.input,
      time: this.updatedAt,
    };
  }
}

export class AsyncActionPromise<
  Data = unknown,
  Input = unknown,
> extends Promise<Data> {
  readonly status: AsyncActionStatus = 'pending';
  readonly value?: Data;
  readonly reason?: unknown;
  readonly source: AsyncActionRun<Data, Input>;

  constructor(
    executor: ConstructorParameters<typeof Promise<Data>>[0],
    source: AsyncActionRun<Data, Input>,
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

import {signal, batch} from '@quilted/signals';
import {dequal} from 'dequal';

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
  static from<Data, Input>(
    asyncFunction: AsyncActionFunction<Data, Input>,
    options?: {cached?: AsyncActionRunCache<Data, Input>},
  ) {
    return new AsyncAction(asyncFunction, options);
  }

  get value() {
    return this.resolved?.value;
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
    return this.#running.value;
  }

  get isRunning() {
    return this.running != null;
  }

  #running = signal<AsyncActionRun<Data, Input> | undefined>(undefined);

  get finished() {
    return this.#finished.value;
  }

  get hasFinished() {
    return this.finished != null;
  }

  #finished = signal<AsyncActionRun<Data, Input> | undefined>(undefined);

  get resolved() {
    return this.#resolved.value;
  }

  get hasResolved() {
    return this.resolved != null;
  }

  #resolved = signal<AsyncActionRun<Data, Input> | undefined>(undefined);

  get latest() {
    return this.#running.value ?? this.#finished.value ?? this.initial;
  }

  #latestPeek() {
    return this.#running.peek() ?? this.#finished.peek() ?? this.initial;
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

  readonly #hasChanged: (
    this: AsyncAction<Data, Input>,
    input?: Input,
    lastInput?: Input,
  ) => boolean;

  #hasRun = false;
  readonly #latestCalls = signal<AsyncActionResults<Data, Input>>({});

  constructor(
    fetchFunction: AsyncActionFunction<Data, Input>,
    {
      cached,
      hasChanged = defaultHasChanged,
    }: {
      cached?: AsyncActionRunCache<Data, Input>;
      hasChanged?(
        this: AsyncAction<Data, Input>,
        input?: Input,
        lastInput?: Input,
      ): boolean;
    } = {},
  ) {
    this.function = fetchFunction;
    this.initial = new AsyncActionRun(this, {
      cached,
      finally: this.#finalizeAction,
    });
    this.#hasChanged = hasChanged;
  }

  run = (
    input?: Input,
    {signal}: {signal?: AbortSignal} = {},
  ): AsyncActionPromise<Data, Input> => {
    const wasRunning = this.#latestCalls.peek().running;

    const actionRun =
      !this.#hasRun && this.initial.status === 'pending'
        ? this.initial
        : new AsyncActionRun(this, {
            finally: this.#finalizeAction,
          });

    this.#hasRun = true;
    actionRun.start(input, {signal});

    batch(() => {
      this.#latestCalls.value = {
        ...this.#latestCalls.peek(),
        running: actionRun,
      };

      wasRunning?.abort();
    });

    return actionRun.promise;
  };

  rerun = ({
    signal,
    force = false,
  }: {signal?: AbortSignal; force?: boolean} = {}) => {
    const latest = this.#latestPeek();

    if (!force && latest.status === 'pending') {
      return latest.promise;
    }

    return this.run(latest.input, {signal});
  };

  hasChanged = (input?: Input) => {
    return this.#hasChanged.call(this, input, this.latest.input);
  };

  #finalizeAction = (actionRun: AsyncActionRun<Data, Input>) => {
    batch(() => {
      if (this.#running.peek() === actionRun) {
        this.#running.value = undefined;
      }

      if (actionRun.signal.aborted) return;

      this.#finished.value = actionRun;

      if (actionRun.status === 'resolved') {
        this.#resolved.value = actionRun;
      }
    });
  };
}

function defaultHasChanged(input?: unknown, lastInput?: unknown) {
  return input !== lastInput && !dequal(input, lastInput);
}

interface AsyncActionResults<Data, Input> {
  finished?: AsyncActionRun<Data, Input>;
  resolved?: AsyncActionRun<Data, Input>;
  running?: AsyncActionRun<Data, Input>;
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
    return this.#abortController.signal;
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

  readonly #resolve: (value: Data) => void;
  readonly #reject: (cause: unknown) => void;
  readonly #abortController = new AbortController();

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

    const promise: AsyncActionPromise<Data, Input> = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }) as any;

    Object.assign(promise, {status: 'pending', source: this});

    this.promise = promise;

    this.#resolve = (value) => {
      if (promise.status !== 'pending') return;

      Object.assign(promise, {status: 'resolved', value});
      if (!this.finishedAt) Object.assign(this, {finishedAt: now()});

      resolve(value);
      onFinally?.(this);
    };
    this.#reject = (reason) => {
      if (promise.status !== 'pending') return;

      Object.assign(promise, {status: 'rejected', reason});
      if (!this.finishedAt) Object.assign(this, {finishedAt: now()});

      reject(reason);
      onFinally?.(this);
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
        this.#reject(cached.error);
      } else {
        this.#resolve(cached.value!);
      }
    } else {
      const {signal} = this.#abortController;

      signal.addEventListener(
        'abort',
        () => {
          this.#reject(signal.reason);
        },
        {once: true},
      );
    }
  }

  abort = (reason?: any) => {
    this.#abortController.abort(reason);
  };

  start = (input?: Input, {signal}: {signal?: AbortSignal} = {}) => {
    if (this.startedAt != null) return this.promise;

    Object.assign(this, {startedAt: now(), input});

    if (signal?.aborted) {
      this.#abortController.abort(signal.reason);
      return this.promise;
    }

    signal?.addEventListener('abort', () => {
      this.#abortController.abort(signal.reason);
    });

    try {
      const {signal} = this.#abortController;

      Promise.resolve(
        this.action.function(input!, {
          signal,
          yield: (value) => {
            if (signal.aborted) return;
            Object.assign(this, {value});
          },
        }),
      ).then(this.#resolve, this.#reject);
    } catch (error) {
      Promise.resolve().then(() => this.#reject(error));
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

export interface AsyncActionPromise<Data, Input> extends Promise<Data> {
  readonly status: AsyncActionStatus;
  readonly value?: Data;
  readonly reason?: unknown;
  readonly source: AsyncActionRun<Data, Input>;
}

function now() {
  return typeof performance === 'object'
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

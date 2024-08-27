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
    return this.latest?.value ?? this.resolved?.value;
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

  #hasRun = false;
  readonly #hasChanged: (
    this: AsyncAction<Data, Input>,
    input?: Input,
    lastInput?: Input,
  ) => boolean;

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
    {signal, force = false}: {signal?: AbortSignal; force?: boolean} = {},
  ): AsyncActionPromise<Data, Input> => {
    const latest = this.#latestPeek();

    if (
      !force &&
      this.#hasRun &&
      latest.status !== 'rejected' &&
      !this.#hasChanged(input, latest.input)
    ) {
      return latest.promise;
    }

    const wasRunning = this.#running.peek();

    const actionRun =
      !this.#hasRun && this.initial.status === 'pending'
        ? this.initial
        : new AsyncActionRun(this, {
            finally: this.#finalizeAction,
          });

    batch(() => {
      this.#hasRun = true;
      actionRun.start(input, {signal});
      this.#running.value = actionRun;
      wasRunning?.abort();
    });

    return actionRun.promise;
  };

  rerun = ({
    signal,
    force = true,
  }: {signal?: AbortSignal; force?: boolean} = {}) => {
    const latest = this.#latestPeek();
    return this.run(latest.input, {signal, force});
  };

  hasChanged = (input?: Input) => {
    return this.#hasChanged.call(this, input, this.#latestPeek().input);
  };

  serialize() {
    return this.finished?.serialize();
  }

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

export class AsyncActionRun<Data = unknown, Input = unknown> {
  readonly promise: AsyncActionPromise<Data, Input>;
  readonly action: AsyncAction<Data, Input>;
  readonly cached: boolean;
  readonly input?: Input;

  get value() {
    return this.#value.value;
  }

  get data() {
    return this.value;
  }

  readonly #value = signal<Data | undefined>(undefined);

  get error() {
    return this.promise.status === 'rejected' ? this.promise.reason : undefined;
  }

  get signal() {
    this.#abortController ??= new AbortController();
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
  #abortController: AbortController | undefined;

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
    Object.defineProperty(promise, 'value', {
      get: () => {
        return this.#value.peek();
      },
      set: (value: Data) => {
        this.#value.value = value;
      },
      configurable: true,
      enumerable: false,
    });

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
    }
  }

  abort = (reason: any = new AsyncActionAbortError()) => {
    this.#reject(reason);
    this.#abortController ??= new AbortController();
    this.#abortController.abort(reason);
  };

  start = (input?: Input, {signal}: {signal?: AbortSignal} = {}) => {
    if (this.startedAt != null) return this.promise;

    Object.assign(this, {startedAt: now(), input});

    this.#abortController ??= new AbortController();
    const runSignal = this.#abortController.signal;

    if (runSignal.aborted) {
      return this.promise;
    }

    if (signal?.aborted) {
      this.abort(signal.reason);
      return this.promise;
    }

    runSignal.addEventListener(
      'abort',
      () => {
        this.#reject(runSignal.reason);
      },
      {once: true},
    );

    signal?.addEventListener('abort', () => {
      this.abort(signal.reason);
    });

    try {
      Promise.resolve(
        this.action.function(input!, {
          signal: runSignal,
          yield: (value) => {
            if (runSignal.aborted) return;
            this.#value.value = value;
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

class AsyncActionAbortError extends Error {
  constructor() {
    super('The async action was aborted');
    this.name = 'AsyncActionAbortError';
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
    ? Math.round(performance.timeOrigin + performance.now())
    : Date.now();
}

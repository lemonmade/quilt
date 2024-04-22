import {signal} from '@quilted/signals';

export class AsyncAction<T> {
  get status() {
    return this.finished.value?.promise.status ?? 'pending';
  }

  get isRunning() {
    return this.running.value != null;
  }

  get value() {
    const active = this.finished.value?.promise;
    return active?.status === 'fulfilled' ? active.value : undefined;
  }

  get error() {
    const active = this.finished.value?.promise;
    return active?.status === 'rejected' ? active.reason : undefined;
  }

  get promise(): AsyncActionPromise<T> {
    return (
      this.running.value?.promise ??
      this.finished.value?.promise ??
      this.initial?.promise
    );
  }

  private readonly running = signal<AsyncActionDeferred<T> | undefined>(
    undefined,
  );
  private readonly finished = signal<AsyncActionDeferred<T> | undefined>(
    undefined,
  );
  private readonly initial = new AsyncActionDeferred<T>();

  constructor(
    private readonly runInternal: (options: {
      signal?: AbortSignal;
    }) => PromiseLike<T>,
    {initial}: {initial?: T} = {},
  ) {
    if (initial) {
      this.initial.resolve(initial);
      this.finished.value = this.initial;
    }
  }

  run = ({signal}: {signal?: AbortSignal} = {}): AsyncActionPromise<T> => {
    const deferred =
      this.running.peek() == null && this.finished.peek() == null
        ? this.initial
        : new AsyncActionDeferred<T>();

    this.runInternal({signal}).then(
      (value) => {
        if (this.running.peek() === deferred) {
          this.running.value = undefined;
        }

        if (signal?.aborted) return;

        deferred.resolve(value);
        this.finished.value = deferred;
      },
      (reason) => {
        if (this.running.peek() === deferred) {
          this.running.value = undefined;
        }

        if (signal?.aborted) return;

        deferred.reject(reason);
        this.finished.value = deferred;
      },
    );

    this.running.value = deferred;

    return deferred.promise;
  };
}

export class AsyncActionPromise<T> extends Promise<T> {
  readonly status?: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  readonly value?: T;
  readonly reason?: unknown;

  constructor(executor: ConstructorParameters<typeof Promise<T>>[0]) {
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

export class AsyncActionDeferred<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
  readonly promise: AsyncActionPromise<T>;

  constructor() {
    let resolve!: this['resolve'];
    let reject!: this['reject'];

    this.promise = new AsyncActionPromise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.resolve = resolve;
    this.reject = reject;
  }
}

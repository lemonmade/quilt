import {signal} from '@quilted/signals';

export interface AsyncObservablePromise<T> extends Promise<T> {
  readonly status?: 'pending' | 'fulfilled' | 'rejected';
  readonly value?: T;
  readonly reason?: unknown;
}

export class AsyncOperation<T> {
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

  get promise(): AsyncObservablePromise<T> {
    return (
      this.running.value?.promise ??
      this.finished.value?.promise ??
      this.initial?.promise
    );
  }

  private readonly running = signal<AsyncObservableDeferred<T> | undefined>(
    undefined,
  );
  private readonly finished = signal<AsyncObservableDeferred<T> | undefined>(
    undefined,
  );
  private readonly initial = new AsyncObservableDeferred<T>();

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

  run = ({signal}: {signal?: AbortSignal} = {}): AsyncObservablePromise<T> => {
    const deferred =
      this.running.peek() == null && this.finished.peek() == null
        ? this.initial
        : new AsyncObservableDeferred<T>();

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

class AsyncObservableDeferred<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
  readonly promise: AsyncObservablePromise<T>;

  constructor() {
    let resolve: this['resolve'];
    let reject: this['reject'];

    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    Object.assign(this.promise, {status: 'pending'});

    this.resolve = (value) => {
      Object.assign(this.promise, {status: 'fulfilled', value});
      resolve(value);
    };

    this.reject = (reason) => {
      Object.assign(this.promise, {status: 'rejected', reason});
      reject(reason);
    };
  }
}

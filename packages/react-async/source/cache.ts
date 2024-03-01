import {useMemo} from 'react';

export function useAsync<T>(
  run: () => PromiseLike<T>,
  {active = true, signal}: {active?: boolean; signal?: AbortSignal} = {},
) {
  const operation = useMemo(() => new AsyncOperation(run), []);

  if (active && operation.status === 'pending') {
    throw operation.run({signal});
  }

  return operation;
}

import {signal} from '@quilted/react-signals';

export interface AsyncObservablePromise<T> extends Promise<T> {
  readonly status?: 'pending' | 'fulfilled' | 'rejected';
  readonly value?: T;
  readonly reason?: unknown;
}

export class AsyncOperation<T> {
  get status() {
    return this.finished.value?.status ?? 'pending';
  }

  get isRunning() {
    return this.running.value != null;
  }

  get value() {
    const active = this.finished.value;
    return active?.status === 'fulfilled' ? active.value : undefined;
  }

  get error() {
    const active = this.finished.value;
    return active?.status === 'rejected' ? active.reason : undefined;
  }

  get promise(): AsyncObservablePromise<T> {
    return this.running.value ?? this.finished.value ?? this.initial;
  }

  private readonly running = signal<AsyncObservablePromise<T> | undefined>(
    undefined,
  );
  private readonly finished = signal<AsyncObservablePromise<T> | undefined>(
    undefined,
  );
  private readonly initial = new AsyncObservableDeferred<T>();

  constructor(
    private readonly runInternal: (options: {
      signal?: AbortSignal;
    }) => PromiseLike<T>,
  ) {}

  run = ({signal}: {signal?: AbortSignal} = {}) => {
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

    return deferred;
  };
}

class AsyncObservableDeferred<T>
  extends Promise<T>
  implements AsyncObservablePromise<T>
{
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
  readonly status = 'pending';

  constructor() {
    let resolve: this['resolve'];
    let reject: this['reject'];

    super((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.resolve = (value) => {
      Object.assign(this, {status: 'fulfilled', value});
      resolve(value);
    };

    this.reject = (cause) => {
      Object.assign(this, {status: 'rejected', cause});
      reject(cause);
    };
  }
}

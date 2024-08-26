/**
 * A representation of an `AbortSignal` that can be serialized between
 * two threads.
 */
export interface ThreadAbortSignalSerialization {
  /**
   * Whether the signal was already aborted at the time it was
   * sent to the sibling thread.
   */
  readonly aborted: boolean;

  /**
   * A function to connect the signal between the two threads. This
   * function should be called by the sibling thread when the abort
   * state changes (including changes since the thread-safe abort signal
   * was created).
   */
  start?(listener: (aborted: boolean) => void): void;
}

export interface ThreadAbortSignalOptions {
  /**
   * An optional AbortSignal that can cancel synchronizing the
   * (Preact) signal to its paired thread.
   */
  signal?: AbortSignal;

  /**
   * An optional function to call in order to manually retain the memory
   * associated with the `start` function of the serialized signal.
   * You only need to use this when using a strategy for serializing the
   * abort signal that requires manual memory management.
   */
  retain?(value: unknown): void;

  /**
   * An optional function to call in order to manually release the memory
   * associated with the `start` function of the serialized signal.
   * You only need to use this when using a strategy for serializing the
   * abort signal that requires manual memory management.
   */
  release?(value: unknown): void;
}

/**
 * Converts a serialized `AbortSignal` into a “live” one, which you can
 * use to cancel operations in the current environment. When the signal aborts,
 * all memory associated with the signal will be released automatically.
 */
export class ThreadAbortSignal implements AbortSignal {
  #abortController: AbortController | undefined;
  #abortSignal: AbortSignal;
  #onabort: AbortSignal['onabort'] | null = null;

  // Proxy properties
  get aborted(): boolean {
    return this.#abortSignal.aborted;
  }

  get reason(): any {
    return this.#abortSignal.reason;
  }

  get onabort() {
    return this.#onabort;
  }

  set onabort(value) {
    if (this.#onabort) {
      this.#abortSignal.removeEventListener('abort', this.#onabort);
    }

    this.#onabort = value;

    if (value) {
      this.#abortSignal.addEventListener('abort', value);
    }
  }

  constructor(
    signal: AbortSignal | ThreadAbortSignalSerialization | undefined,
    {signal: killswitchSignal, retain, release}: ThreadAbortSignalOptions = {},
  ) {
    if (isAbortSignal(signal)) {
      this.#abortSignal = signal;
    } else {
      this.#abortController = new AbortController();
      this.#abortSignal = this.#abortController.signal;

      const {aborted, start} = signal ?? {};

      if (aborted) {
        this.#abortController.abort();
      } else if (start) {
        retain?.(start);

        start((aborted) => {
          if (aborted) this.#abortController!.abort();
        });

        if (release) {
          killswitchSignal?.addEventListener(
            'abort',
            () => () => release(start),
            {
              once: true,
              signal: this.#abortSignal,
            },
          );

          this.#abortSignal.addEventListener('abort', () => release(start), {
            once: true,
            signal: killswitchSignal,
          });
        }
      }
    }
  }

  // Proxy methods
  addEventListener(...args: Parameters<AbortSignal['addEventListener']>) {
    return this.#abortSignal.addEventListener(...args);
  }

  removeEventListener(...args: Parameters<AbortSignal['removeEventListener']>) {
    return this.#abortSignal.removeEventListener(...args);
  }

  dispatchEvent(...args: Parameters<AbortSignal['dispatchEvent']>): boolean {
    return this.#abortSignal.dispatchEvent(...args);
  }

  throwIfAborted() {
    return this.#abortSignal.throwIfAborted();
  }

  /**
   * Converts an `AbortSignal` into a version of that signal that can
   * be transferred to a target `Thread`. The resulting object can be
   * serialized using the RPC utilities provided in this library, and
   * passed to `new ThreadAbortSignal()` to be converted into a “live”
   * `AbortSignal`.
   */
  static serialize(
    signal: Pick<AbortSignal, 'aborted' | 'addEventListener'>,
    {retain, release}: ThreadAbortSignalOptions = {},
  ): ThreadAbortSignalSerialization {
    if (signal.aborted) {
      return {
        aborted: true,
      };
    }

    const listeners = new Set<(aborted: boolean) => void>();

    signal.addEventListener(
      'abort',
      () => {
        for (const listener of listeners) {
          listener(signal.aborted);
          release?.(listener);
        }

        listeners.clear();
      },
      {once: true},
    );

    return {
      aborted: false,
      start(listener) {
        if (signal.aborted) {
          listener(true);
        } else {
          retain?.(listener);
          listeners.add(listener);
        }
      },
    };
  }

  /**
   * Checks if a value is a serialized ThreadSignal.
   */
  static isSerialized(value: unknown): value is ThreadAbortSignalSerialization {
    return (
      typeof value === 'object' &&
      value != null &&
      typeof (value as any).aborted === 'boolean' &&
      typeof (value as any).start === 'function'
    );
  }
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return (
    value != null &&
    typeof (value as any).aborted === 'boolean' &&
    typeof (value as any).addEventListener === 'function'
  );
}

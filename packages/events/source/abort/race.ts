import {AbortError} from './AbortError.ts';

/**
 * Waits for the result of a function that returns a promise, and
 * returns its result. However, this promise is "raced" against the
 * `AbortSignal` you provide, and if it aborts before the promise resolves,
 * the promise returned by this function will be rejected.
 *
 * @param race A function that returns a promise. If this function resolves
 * before the `AbortSignal` aborts, the promise returned by `raceAgainstAbortSignal()`
 * will resolve with the same value.
 */
export async function raceAgainstAbortSignal<T>(
  race: () => Promise<T>,
  {
    signal,
    onAbort,
  }: {
    /**
     * The `AbortSignal` to race your promise against.
     */
    signal: AbortSignal;
    /**
     * A function that will be called if the `AbortSignal` aborts. You
     * can use this function to perform some logic when the `AbortSignal`
     * wins the race, without needing to handle the rejected promise.
     */
    onAbort?(): void | Promise<void>;
  },
): Promise<T> {
  const raceAbort = new AbortController();

  const result = await Promise.race([racer(), abortRacer()]);

  return result as T;

  async function racer() {
    try {
      const result = await race();
      return result;
    } finally {
      raceAbort.abort();
    }
  }

  async function abortRacer() {
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener(
        'abort',
        async () => {
          try {
            if (onAbort) await onAbort();
            reject(new AbortError());
          } catch (error) {
            reject(error);
          }
        },
        {signal: raceAbort.signal},
      );

      raceAbort.signal.addEventListener(
        'abort',
        () => {
          resolve();
        },
        {signal},
      );
    });
  }
}

import {AbortError} from './AbortError.ts';

export async function raceAgainstAbortSignal<T>(
  race: () => Promise<T>,
  {
    signal,
    ifAborted,
  }: {signal: AbortSignal; ifAborted?(): void | Promise<void>},
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
            if (ifAborted) await ifAborted();
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

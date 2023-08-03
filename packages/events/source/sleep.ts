/**
 * Returns a promise that resolves after a given amount of time.
 */
export function sleep(
  time: number,
  {
    signal,
  }: {
    /**
     * An optional `AbortSignal` that can be used to cancel the sleep.
     * This will cause the timeout to be cancelled, if it has not already
     * finished.
     */
    signal?: AbortSignal;
  } = {},
) {
  let timeout: ReturnType<typeof setTimeout>;
  let resolvePromise: () => void;

  signal?.addEventListener('abort', () => {
    if (resolvePromise == null || timeout == null) return;
    clearTimeout(timeout);
    resolvePromise();
  });

  return new Promise<void>((resolve) => {
    resolvePromise = resolve;
    timeout = setTimeout(() => resolve(), time);
  });
}

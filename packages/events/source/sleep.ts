export function sleep(time: number, {signal}: {signal?: AbortSignal} = {}) {
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

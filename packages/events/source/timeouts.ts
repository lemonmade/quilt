export class TimedAbortController extends AbortController {
  readonly promise: Promise<void>;
  private timeout!: ReturnType<typeof setTimeout>;

  constructor({time}: {time: number}) {
    super();
    this.promise = new Promise((resolve) => {
      this.timeout = setTimeout(() => {
        if (this.signal.aborted) return;
        this.abort();
        resolve();
      }, time);
    });

    this.signal.addEventListener('abort', () => {
      if (this.timeout) clearTimeout(this.timeout);
    });
  }
}

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

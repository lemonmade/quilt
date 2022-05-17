import {retain, release} from './memory';

export type ThreadAbortSignal =
  | {
      aborted: true;
      start?: never;
    }
  | {
      aborted: false;
      start(
        listener: (aborted: boolean) => void | Promise<void>,
      ): boolean | Promise<boolean>;
    };

export function createThreadAbortSignal(
  signal: AbortSignal,
): ThreadAbortSignal {
  const listeners = new Set<(aborted: boolean) => void>();

  if (signal.aborted) {
    return {
      aborted: true,
    };
  }

  signal.addEventListener(
    'abort',
    () => {
      for (const listener of listeners) {
        listener(signal.aborted);
        release(listener);
        listeners.clear();
      }
    },
    {once: true},
  );

  return {
    aborted: false,
    start(listener) {
      if (signal.aborted) return true;

      retain(listener);
      listeners.add(listener);
      return false;
    },
  };
}

export function acceptThreadAbortSignal(
  signal: AbortSignal | ThreadAbortSignal,
): AbortSignal {
  if (isAbortSignal(signal)) return signal;

  const abort = new AbortController();

  if (signal.aborted) {
    abort.abort();
    return abort.signal;
  }

  retain(signal);

  const handleAbort = (aborted: boolean) => {
    if (aborted) abort.abort();
  };

  Promise.resolve(signal.start(handleAbort)).then(handleAbort);

  abort.signal.addEventListener(
    'abort',
    async () => {
      release(signal);
    },
    {once: true},
  );

  return abort.signal;
}

function isAbortSignal(value?: unknown): value is AbortSignal {
  return (
    value != null &&
    (value as any).aborted != null &&
    typeof (value as any).addEventListener === 'function'
  );
}

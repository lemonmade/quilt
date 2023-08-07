import {retain, release} from '../memory.ts';
import type {ThreadAbortSignal} from './types.ts';

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

import {type Signal} from '@preact/signals-core';
import {createEmitter} from '@quilted/events';

export function signalToIterator<T>(
  signal: Signal<T>,
  {signal: abortSignal}: {signal?: AbortSignal} = {},
) {
  const emitter = createEmitter<{value: T}>();

  const unsubscribe = signal.subscribe((value) => {
    emitter.emit('value', value);
  });

  abortSignal?.addEventListener('abort', () => {
    unsubscribe();
  });

  return run();

  async function* run() {
    yield signal.peek();

    if (abortSignal?.aborted) return;

    for await (const value of emitter.on('value', {signal: abortSignal})) {
      yield value;
    }
  }
}

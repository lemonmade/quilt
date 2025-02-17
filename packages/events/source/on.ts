import {addEventHandler} from './handler.ts';
import {AbortError, NestedAbortController} from './abort.ts';
import type {EventTarget, AbortBehavior, EventHandlerMap} from './types.ts';

/**
 * Listens to an `event` on the `target` object. Instead of providing a callback
 * function to run when the event is emitted, this function returns an `AsyncGenerator`
 * that yields each event as it is emitted.
 *
 * @param target The target to add the event handler to.
 * @param event The name of the event you are targeting.
 *
 * @returns An `AsyncGenerator` that yields each event as it is emitted.
 *
 * @example
 * const button = document.querySelector('button');
 *
 * for await (const event of on(button, 'click')) {
 *   console.log('clicked!', event);
 * }
 */
export function on<
  Events extends EventHandlerMap = Record<string, unknown>,
  Event extends keyof Events = keyof Events,
>(
  target: EventTarget<Events>,
  event: Event,
  options?: {
    /**
     * An `AbortSignal` to cancel listening to the event.
     */
    signal?: AbortSignal;

    /**
     * How to handle the `AbortSignal` being aborted. Defaults to `'resolve'`,
     * which causes the iterator to complete. If set to `'reject'`, the iterator
     * will throw an `AbortError` when the signal is aborted instead.
     */
    abort?: AbortBehavior;
  },
): AsyncGenerator<Events[Event], void, void> {
  const signal = options?.signal;
  const abortBehavior = options?.abort ?? 'resolve';

  if (signal?.aborted) {
    if (abortBehavior === 'resolve') {
      return noop();
    } else {
      return noopThrow(new AbortError());
    }
  }

  const listenerAbortController = signal
    ? new NestedAbortController(signal)
    : new AbortController();
  const signalAbortController = signal && new AbortController();

  const unconsumedEvents: any[] = [];
  const unconsumedPromises: {
    resolve(result: {value: any; done: boolean}): void;
    reject(error: any): void;
  }[] = [];

  let error: Error | null = null;
  let finished = false;

  const asyncDispose = Symbol.asyncDispose ?? Symbol('asyncDispose');

  const iterator: AsyncGenerator<Events[Event], void, void> = {
    next() {
      // First, we consume all unread events
      const value = unconsumedEvents.shift();

      if (value) {
        return Promise.resolve({value, done: false});
      }

      // Then we error, if an error happened
      // This happens one time if at all, because after 'error'
      // we stop listening
      if (error) {
        const promise = Promise.reject(error);
        // Only the first element errors
        error = null;
        return promise;
      }

      // If the iterator is finished, resolve to done
      if (finished) {
        return Promise.resolve({value: undefined, done: true});
      }

      // Wait until an event happens
      return new Promise(function (resolve, reject) {
        unconsumedPromises.push({resolve, reject});
      });
    },

    return() {
      listenerAbortController.abort();
      signalAbortController?.abort();

      finished = true;

      for (const promise of unconsumedPromises) {
        promise.resolve({value: undefined, done: true});
      }

      return Promise.resolve({value: undefined, done: true});
    },

    throw(err) {
      error = err;
      listenerAbortController.abort();
      return Promise.reject(error);
    },

    [Symbol.asyncIterator]() {
      return this;
    },

    async [asyncDispose as typeof Symbol.asyncDispose]() {},
  };

  addEventHandler(target, event as any, eventHandler, {
    signal: listenerAbortController.signal,
  });

  if (signal) {
    addEventHandler(signal, 'abort', abortListener, {
      once: true,
      signal: signalAbortController!.signal,
    });
  }

  return iterator;

  function abortListener() {
    if (abortBehavior === 'resolve') {
      iterator.return!();
    } else {
      handleError(new AbortError());
    }
  }

  function eventHandler(...args: any[]) {
    const promise = unconsumedPromises.shift();
    const normalizedArgs = args.length > 1 ? args : args[0];

    if (promise) {
      promise.resolve({value: normalizedArgs, done: false});
    } else {
      unconsumedEvents.push(normalizedArgs);
    }
  }

  function handleError(err: Error) {
    finished = true;

    const toError = unconsumedPromises.shift();

    if (toError) {
      toError.reject(err);
    } else {
      // The next time we call next()
      error = err;
    }

    iterator.return!();
  }
}

async function* noop() {
  // intentionally empty
}

async function* noopThrow(error: Error) {
  throw error;
}

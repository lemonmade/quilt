import {addListener} from './listeners.ts';
import type {AbortBehavior} from './abort.ts';
import {AbortError, NestedAbortController} from './abort.ts';
import type {EventTarget} from './types.ts';

// @see https://github.com/nodejs/node/blob/master/lib/events.js#L1012-L1019
export function on<
  EventMap = Record<string, unknown>,
  Event extends keyof EventMap = keyof EventMap,
  Target extends EventTarget<EventMap> = EventTarget<EventMap>,
>(
  emitter: Target,
  event: Event,
  options?: {signal?: AbortSignal; abort?: AbortBehavior},
): AsyncIterator<EventMap[Event], void, void> & AsyncIterable<EventMap[Event]> {
  const signal = options?.signal;
  const abortBehavior = options?.abort ?? 'returns';

  if (signal?.aborted) {
    if (abortBehavior === 'returns') {
      return noop();
    } else {
      throw new AbortError();
    }
  }

  const listenerAbortController = new NestedAbortController(signal);
  const signalAbortController = signal && new AbortController();

  const unconsumedEvents: any[] = [];
  const unconsumedPromises: {
    resolve(result: {value: any; done: boolean}): void;
    reject(error: any): void;
  }[] = [];

  let error: Error | null = null;
  let finished = false;

  const iterator: AsyncIterator<EventMap[Event], void, void> &
    AsyncIterable<EventMap[Event]> = {
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
  };

  addListener(emitter, event as any, eventHandler, {
    signal: listenerAbortController.signal,
  });

  if (signal) {
    addListener(signal, 'abort', abortListener, {
      once: true,
      signal: signalAbortController!.signal,
    });
  }

  return iterator;

  function abortListener() {
    if (abortBehavior === 'returns') {
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

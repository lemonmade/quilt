import type {AnyFunction} from '../types.ts';
import type {AnyThread, ThreadFunctions} from '../Thread.ts';
import {MESSAGE_FUNCTION_CALL, MESSAGE_FUNCTION_RELEASE} from '../constants.ts';
import {nanoid} from '../nanoid.ts';

/**
 * A strategy for managing functions across threads that automatically releases
 * functions when they are no longer needed. This is done by deserializing functions
 * into a proxy that can be called, and wrapping that proxy in a `FinalizationRegistry`,
 * which allows us to send a message to the parent thread when the function is no
 * longer used.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
 */
export class ThreadFunctionsAutomatic implements ThreadFunctions {
  #functionsToId = new Map<AnyFunction, string>();
  #idsToFunction = new Map<string, AnyFunction>();
  #idsToProxy = new Map<string, WeakRef<AnyFunction>>();
  #finalization = new WeakMap<AnyThread, FinalizationRegistry<string>>();

  get(id: string) {
    return this.#idsToFunction.get(id);
  }

  release(id: string) {
    const func = this.#idsToFunction.get(id);

    if (func) {
      this.#idsToFunction.delete(id);
      this.#functionsToId.delete(func);
    }

    return Boolean(func);
  }

  serialize(func: AnyFunction) {
    let id = this.#functionsToId.get(func);

    if (id == null) {
      id = nanoid();
      this.#functionsToId.set(func, id);
      this.#idsToFunction.set(id, func);
    }

    return id;
  }

  deserialize(id: string, thread: AnyThread) {
    let proxy = this.#idsToProxy.get(id)?.deref();

    if (proxy) return proxy;

    proxy = (...args: any[]) => {
      if (!this.#idsToProxy.has(id)) {
        throw new Error(
          'You attempted to call a function that was already revoked.',
        );
      }

      return thread.call((callID, args, transferable) => {
        thread.messages.send(
          [MESSAGE_FUNCTION_CALL, callID, id, args],
          transferable,
        );
      }, args);
    };

    this.#finalizationRegistry(thread)?.register(proxy, id);
    this.#idsToProxy.set(id, new WeakRef(proxy));

    return proxy;
  }

  #finalizationRegistry(thread: AnyThread) {
    let finalization = this.#finalization.get(thread);

    if (typeof FinalizationRegistry === 'undefined') {
      return undefined;
    }

    if (!finalization) {
      finalization = new FinalizationRegistry((id) => {
        thread.messages.send([MESSAGE_FUNCTION_RELEASE, id]);
      });

      this.#finalization.set(thread, finalization);
    }

    return finalization;
  }
}

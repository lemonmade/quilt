import {
  RELEASE_METHOD,
  RETAIN_METHOD,
  RETAINED_BY,
  StackFrame,
  isMemoryManageable,
  type MemoryRetainer,
  type MemoryManageable,
} from '../memory.ts';
import type {AnyFunction} from '../types.ts';
import type {AnyThread, ThreadFunctions} from '../Thread.ts';
import {MESSAGE_FUNCTION_CALL, MESSAGE_FUNCTION_RELEASE} from '../constants.ts';
import {nanoid} from '../nanoid.ts';

/**
 * A strategy for managing functions across threads that manually manages memory.
 * Functions are deserialized into a proxy that can be called, and when an equal number
 * of `retain()` and `release()` calls have been made with that function, it will
 * be released and no longer callable.
 *
 * For more details on manual memory management, refer to the
 * [dedicated README section](https://github.com/lemonmade/quilt/blob/main/packages/threads/README.md#memory-management).
 *
 * @see
 */
export class ThreadFunctionsManualMemoryManagement implements ThreadFunctions {
  #functionsToId = new Map<AnyFunction, string>();
  #idsToFunction = new Map<string, AnyFunction>();
  #idsToProxy = new Map<string, AnyFunction>();
  #nextRetainers?: MemoryRetainer[];

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

  async call(func: AnyFunction, args: any[], thread: AnyThread) {
    const stackFrame = new StackFrame();

    try {
      this.#nextRetainers = isMemoryManageable(func)
        ? [...func[RETAINED_BY], stackFrame]
        : [stackFrame];

      const deserializedArgs = thread.serialization.deserialize(
        args,
        thread,
      ) as any[];

      this.#nextRetainers = undefined;

      const result = await func(...deserializedArgs);

      return result;
    } finally {
      stackFrame.release();
    }
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
    let proxy = this.#idsToProxy.get(id);

    if (proxy) return proxy;

    let retainCount = 0;
    let released = false;

    const release = () => {
      retainCount -= 1;

      if (retainCount === 0) {
        released = true;
        this.#idsToProxy.delete(id);
        thread.messages.send([MESSAGE_FUNCTION_RELEASE, id]);
      }
    };

    const retain = () => {
      retainCount += 1;
    };

    proxy = (...args: any[]) => {
      if (released) {
        throw new Error(
          'You attempted to call a function that was already released.',
        );
      }

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

    Object.defineProperties(proxy, {
      [RELEASE_METHOD]: {value: release, writable: false},
      [RETAIN_METHOD]: {value: retain, writable: false},
      [RETAINED_BY]: {value: new Set(), writable: false},
    });

    this.#idsToProxy.set(id, proxy);

    if (this.#nextRetainers) {
      for (const retainer of this.#nextRetainers) {
        retainer.add(proxy as any as MemoryManageable);
      }
    }

    return proxy;
  }
}

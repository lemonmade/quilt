import {NestedAbortController} from '@quilted/events';

import type {AnyFunction} from './types.ts';
import {ThreadClosedError} from './errors.ts';
import {nanoid} from './nanoid.ts';
import {
  MESSAGE_CALL,
  MESSAGE_CALL_RESULT,
  MESSAGE_FUNCTION_CALL,
  MESSAGE_FUNCTION_RESULT,
  MESSAGE_FUNCTION_RELEASE,
} from './constants.ts';

import {ThreadFunctionsAutomatic} from './functions/ThreadFunctionsAutomatic.ts';
import {ThreadSerializationStructuredClone} from './serialization/ThreadSerializationStructuredClone.ts';

/**
 * An object that can serialize and deserialize values communicated between two threads.
 */
export interface ThreadSerialization {
  /**
   * Called when the thread is started, to allow the serializer to set up any
   * necessary state.
   */
  start?(thread: AnyThread): void;

  /**
   * Serializes a value before sending it to another thread.
   */
  serialize(value: unknown, thread: AnyThread, transferable?: any[]): unknown;

  /**
   * Deserializes a value received from another thread.
   */
  deserialize(value: unknown, thread: AnyThread): unknown;
}

/**
 * An object that can serialize and deserialize values communicated between two threads.
 */
export interface ThreadFunctions {
  /**
   * Called when the thread is started, to allow the function handler to set up any
   * necessary state.
   */
  start?(thread: AnyThread): void;

  /**
   * Requests that you call the function with the provided arguments. If you
   * do not provide this hook, a default implementation will be provided for you.
   * This hook is available so that you can wrap each individual proxied function
   * call with logic, such as to perform manual memory management.
   */
  call?(func: AnyFunction, args: any[], thread: AnyThread): Promise<any>;

  /**
   * Gets a stored function by its ID.
   */
  get(id: string, thread: AnyThread): AnyFunction | undefined;

  /**
   * Releases a stored function by its ID.
   */
  release(id: string, thread: AnyThread): boolean;

  /**
   * Serializes a function before sending it to another thread.
   */
  serialize(
    value: AnyFunction,
    thread: AnyThread,
    transferable?: any[],
  ): string;

  /**
   * Deserializes a function received from another thread.
   */
  deserialize(id: string, thread: AnyThread): AnyFunction;
}

/**
 * Options to customize the creation of a `ThreadSerialization` instance.
 */
export interface ThreadSerializationOptions {
  /**
   * A custom function to run when serializing values. If this function returns `undefined`,
   * the default serialization will be used. You can also call the second argument to this function
   * to apply the default serialization to subsets of the value.
   */
  serialize?(
    value: object,
    defaultSerialize: (value: unknown) => unknown,
    thread: AnyThread,
    transferable?: any[],
  ): any | undefined;

  /**
   * A custom function to run when deserializing values. If this function returns `undefined`,
   * the default deserialization will be used. You can also call the second argument to this function
   * to apply the default deserialization to subsets of the value.
   */
  deserialize?(
    value: object,
    defaultDeserialize: (value: unknown) => unknown,
    thread: AnyThread,
  ): any | undefined;
}

/**
 * Options to customize the creation of a `Thread` instance.
 */
export interface ThreadOptions<
  Target = Record<string, never>,
  Self = Record<string, never>,
> {
  /**
   * A list of callable methods exported on the paired `Thread`. This option is
   * required if you want to call methods and your environment does not support
   * the `Proxy` constructor. When the `Proxy` constructor is available, `Thread()`
   * will forward all method calls to the paired thread by default.
   */
  readonly imports?: (keyof Target)[];

  /**
   * Methods to export on this thread, so that they are callable on the paired thread.
   * This should be an object, with each member of that object being a function. Remember
   * that these functions will become asynchronous when called over the thread boundary.
   */
  readonly exports?: Self;

  /**
   * An `AbortSignal` that controls whether the thread is active or not. When aborted,
   * the thread will no longer send any messages to the underlying object, will stop
   * listening for messages from that object, and will clean up any memory associated
   * with in-progress communication between the threads.
   */
  readonly signal?: AbortSignal;

  /**
   * An object that will manage how functions are proxied between threads.
   */
  readonly functions?: ThreadFunctions;

  /**
   * An object that will serialize and decode messages sent between threads. If not
   * specified, a suitable default serialization technique will be used.
   */
  readonly serialization?: ThreadSerialization;
}

/**
 * An object backing a `Thread` that provides the message-passing interface
 * that allows communication to flow between environments. This message-passing
 * interface is based on the [`postMessage` interface](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage),
 * which is easily adaptable to many JavaScript objects and environments.
 */
export interface ThreadMessageTarget {
  /**
   * Sends a message to the target thread. The message will be encoded before sending,
   * and the consumer may also pass an array of "transferable" objects that should be
   * transferred (rather than copied) to the other environment, if supported.
   */
  send(message: any, transferables?: Transferable[]): void;

  /**
   * Listens for messages coming in to the thread. This method must call the provided
   * listener for each message as it is received. The thread will then decode the message
   * and handle its content. This method may be passed an `AbortSignal` to abort the
   * listening process.
   */
  listen(listener: (value: any) => void, options: {signal?: AbortSignal}): void;
}

/**
 * A map of messages that can be sent between threads.
 */
export interface ThreadMessageMap {
  [MESSAGE_CALL]: [exported: string, id: string, args: any];
  [MESSAGE_CALL_RESULT]: [id: string, value?: any, error?: any];
  [MESSAGE_FUNCTION_CALL]: [funcID: string, id: string, args: any];
  [MESSAGE_FUNCTION_RESULT]: [id: string, value?: any, error?: any];
  [MESSAGE_FUNCTION_RELEASE]: [funcID: string];
}

/**
 * The possible data payloads that can be transferred between threads.
 */
export type ThreadMessageData = {
  [K in keyof ThreadMessageMap]: [K, ...ThreadMessageMap[K]];
}[keyof ThreadMessageMap];

/**
 * A helper type that extracts all callable methods that can be safely proxied
 * between threads; that is, ones which return a promise or async iterator.
 */
export type ThreadImports<Target> = {
  [K in keyof Target]: Target[K] extends (...args: any[]) => infer ReturnType
    ? ReturnType extends Promise<any> | AsyncIterator<any, any, any>
      ? Target[K]
      : never
    : never;
};

export type AnyThread = Thread<any, any>;

/**
 * A thread represents a target JavaScript environment that exposes a set
 * of callable, asynchronous methods. The thread takes care of automatically
 * encoding and decoding its arguments and return values, so you can interact
 * with it as if its methods were implemented in the same environment as your
 * own code.
 */
export class Thread<
  Target = Record<string, never>,
  Self = Record<string, never>,
> {
  /**
   * An object that exposes the methods that can be called on the paired thread.
   * This object will automatically encode and decode arguments and return values
   * as necessary.
   */
  readonly imports: ThreadImports<Target>;

  /**
   * An object that exposes the methods that can be called on this thread by the
   * paired thread. To set these methods, pass the `exports` option when creating
   * a new `Thread`.
   */
  readonly exports: Self;

  /**
   * An object that provides the message-passing interface that allows communication
   * to flow between environments.
   */
  readonly messages: ThreadMessageTarget;

  /**
   * An object that manages how functions are proxied between threads.
   */
  readonly functions: ThreadFunctions;

  /**
   * An object that manages how values are serialized and deserialized between threads.
   */
  readonly serialization: ThreadSerialization;

  /**
   * An `AbortSignal` that indicates whether the communication channel is still open.
   */
  get signal() {
    return this.#abort.signal;
  }

  /**
   * A boolean indicating whether the communication channel is still open.
   */
  get closed() {
    return this.#abort.signal.aborted;
  }

  readonly #abort: NestedAbortController;
  readonly #idsToResolver = new Map<
    string,
    (id: string, result?: any, error?: any) => void
  >();

  constructor(
    messages: ThreadMessageTarget,
    {
      imports,
      exports,
      functions = new ThreadFunctionsAutomatic(),
      serialization = new ThreadSerializationStructuredClone(),
      signal,
    }: ThreadOptions<Target, Self> = {},
  ) {
    this.messages = messages;
    this.#abort = signal
      ? new NestedAbortController(signal)
      : new AbortController();

    this.exports = exports ?? ({} as any);
    this.imports = createThreadImports(
      this.#handlerForCall.bind(this),
      imports,
    );
    this.functions = functions;
    this.serialization = serialization;

    this.functions.start?.(this);
    this.serialization.start?.(this);

    this.signal.addEventListener(
      'abort',
      () => {
        for (const id of this.#idsToResolver.keys()) {
          this.#resolveCall(id, undefined, new ThreadClosedError());
        }

        this.#idsToResolver.clear();
      },
      {once: true},
    );

    messages.listen(
      async (rawData) => {
        const isThreadMessageData =
          Array.isArray(rawData) && typeof rawData[0] === 'number';

        if (!isThreadMessageData) {
          return;
        }

        const data = rawData as ThreadMessageData;

        switch (data[0]) {
          case MESSAGE_CALL: {
            const [, id, property, args] = data;
            const func = (this.exports[property as keyof Self] ??
              (() => {
                throw new Error(
                  `No '${property}' method is exported from this thread`,
                );
              })) as AnyFunction;

            await this.#callLocal(func, args, (value, error, transferable) => {
              this.messages.send(
                [MESSAGE_CALL_RESULT, id, value, error],
                transferable,
              );
            });

            break;
          }

          case MESSAGE_FUNCTION_CALL: {
            const [, callID, funcID, args] = data;

            const func = (this.functions.get(funcID, this) ??
              missingThreadFunction) as AnyFunction;

            await this.#callLocal(func, args, (value, error, transferable) => {
              this.messages.send(
                [MESSAGE_FUNCTION_RESULT, callID, value, error],
                transferable,
              );
            });

            break;
          }

          case MESSAGE_CALL_RESULT:
          case MESSAGE_FUNCTION_RESULT: {
            this.#resolveCall(...(data.slice(1) as [any]));
            break;
          }

          case MESSAGE_FUNCTION_RELEASE: {
            const id = data[1];
            this.functions.release(id, this);
            break;
          }
        }
      },
      {signal: this.signal},
    );
  }

  /**
   * Closes the communication channel between the two threads. This will prevent
   * any further communication between the threads, and will clean up any memory
   * associated with in-progress communication. It will also reject any inflight
   * function calls between threads with a `ThreadClosedError`.
   */
  close() {
    this.#abort.abort();
  }

  /**
   * Requests that the thread provide the context needed to make a function
   * call between threads. You provide this method a function to call and the
   * unserialized arguments you wish to call it with, and the thread will call
   * the function you provided with a serialized call ID, the serialized arguments,
   * and any transferable objects that need to be passed between threads.
   */
  call(
    func: (id: string, args: any[], transferable?: any[]) => void,
    args: any[],
  ) {
    if (this.closed) {
      return Promise.reject(new ThreadClosedError());
    }

    const transferable: any[] = [];
    const serialized = this.serialization.serialize(
      args,
      this,
      transferable,
    ) as any[];

    const id = nanoid();
    const done = this.#waitForResult(id);

    func(id, serialized, transferable);

    return done;
  }

  async #callLocal(
    func: AnyFunction,
    args: any[],
    withResult: (value?: any, error?: any, transferable?: any[]) => void,
  ) {
    try {
      const result = this.functions.call
        ? await this.functions.call(func, args, this)
        : await func(...(this.serialization.deserialize(args, this) as any[]));

      const transferable: any[] = [];
      const serialized = this.serialization.serialize(
        result,
        this,
        transferable,
      );

      withResult(serialized, undefined, transferable);
    } catch (error) {
      withResult(undefined, this.serialization.serialize(error, this));
    }
  }

  #handlerForCall(property: string | number | symbol) {
    return (...args: any[]) => {
      try {
        if (typeof property !== 'string' && typeof property !== 'number') {
          throw new Error(
            `Can’t call a symbol method on a thread: ${property.toString()}`,
          );
        }

        return this.call((id, serializedArgs, transferable) => {
          this.messages.send(
            [MESSAGE_CALL, id, property, serializedArgs],
            transferable,
          );
        }, args);
      } catch (error) {
        return Promise.reject(error);
      }
    };
  }

  #resolveCall(
    ...args: ThreadMessageMap[
      | typeof MESSAGE_CALL_RESULT
      | typeof MESSAGE_CALL_RESULT]
  ) {
    const callID = args[0];

    const resolver = this.#idsToResolver.get(callID);

    if (resolver) {
      resolver(...args);
      this.#idsToResolver.delete(callID);
    }
  }

  #waitForResult(id: string) {
    const promise = new Promise<any>((resolve, reject) => {
      this.#idsToResolver.set(id, (_, value, error) => {
        if (error == null) {
          resolve(this.serialization.deserialize(value, this));
        } else {
          reject(this.serialization.deserialize(error, this));
        }
      });
    });

    Object.defineProperty(promise, Symbol.asyncIterator, {
      async *value() {
        const result = await promise;

        Object.defineProperty(result, Symbol.asyncIterator, {
          value: () => result,
        });

        yield* result;
      },
    });

    return promise;
  }
}

function createThreadImports<T>(
  handlerForImport: (
    property: string | number | symbol,
  ) => AnyFunction | undefined,
  imported?: (keyof T)[],
): ThreadImports<T> {
  let call: any;

  if (imported == null) {
    if (typeof Proxy !== 'function') {
      throw new Error(
        `You must pass an array of callable methods in environments without Proxies.`,
      );
    }

    const cache = new Map<string | number | symbol, AnyFunction | undefined>();

    call = new Proxy(
      {},
      {
        get(_target, property) {
          if (cache.has(property)) {
            return cache.get(property);
          }

          const handler = handlerForImport(property);
          cache.set(property, handler);
          return handler;
        },
      },
    );
  } else {
    call = {};

    for (const method of imported) {
      Object.defineProperty(call, method, {
        value: handlerForImport(method),
        writable: false,
        configurable: true,
        enumerable: true,
      });
    }
  }

  return call;
}

function missingThreadFunction() {
  throw new Error(
    `You attempted to call a function that is not stored. It may have already been released.`,
  );
}

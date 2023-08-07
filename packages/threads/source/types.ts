import type {
  RELEASE_METHOD,
  RETAIN_METHOD,
  ENCODE_METHOD,
  RETAINED_BY,
} from './constants.ts';

/**
 * A thread represents a target JavaScript environment that exposes a set
 * of callable, asynchronous methods. The thread takes care of automatically
 * encoding and decoding its arguments and return values, so you can interact
 * with it as if its methods were implemented in the same environment as your
 * own code.
 */
export type Thread<Target> = ThreadCallable<Target>;

/**
 * An object backing a `Thread` that provides the message-passing interface
 * that allows communication to flow between environments. This message-passing
 * interface is based on the [`postMessage` interface](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage),
 * which is easily adaptable to many JavaScript objects and environments.
 */
export interface ThreadTarget {
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
 * A function type that can be called over a thread. It is the same as defining a
 * normal function type, but with the additional restriction that the function must
 * always return an asynchronous value (either a promise or an async generator). Additionally,
 * all arguments to that function must also be thread-callable
 */
export interface ThreadCallableFunction<Args extends any[], ReturnType> {
  (...args: ThreadSafeArgument<Args>): ThreadSafeReturnType<ReturnType>;
}

/**
 * A mapped object type that takes an object with methods, and converts it into the
 * an object with the same methods that can be called over a thread.
 */
export type ThreadCallable<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer ReturnType
    ? ThreadCallableFunction<Args, ReturnType>
    : never;
};

export type MaybePromise<T> = T extends Promise<any> ? T : T | Promise<T>;

/**
 * Converts the return type of a function into the type it will be when
 * passed over a thread.
 */
export type ThreadSafeReturnType<T> = T extends AsyncGenerator<
  infer T,
  infer R,
  infer N
>
  ? AsyncGenerator<
      ThreadSafeReturnValueType<T>,
      ThreadSafeReturnValueType<R>,
      ThreadSafeReturnValueType<N>
    >
  : T extends Generator<infer T, infer R, infer N>
  ?
      | Generator<
          ThreadSafeReturnValueType<T>,
          ThreadSafeReturnValueType<R>,
          ThreadSafeReturnValueType<N>
        >
      | AsyncGenerator<
          ThreadSafeReturnValueType<T>,
          ThreadSafeReturnValueType<R>,
          ThreadSafeReturnValueType<N>
        >
  : T extends Promise<infer U>
  ? Promise<ThreadSafeReturnValueType<U>>
  : T extends infer U | Promise<infer U>
  ? Promise<ThreadSafeReturnValueType<U>>
  : Promise<ThreadSafeReturnValueType<T>>;

/**
 * Converts an object into the type it will be when passed over a thread.
 */
export type ThreadSafeReturnValueType<T> = T extends (
  ...args: infer Args
) => infer ReturnType
  ? ThreadCallableFunction<Args, ReturnType>
  : T extends (infer ArrayElement)[]
  ? ThreadSafeReturnValueType<ArrayElement>[]
  : T extends readonly (infer ArrayElement)[]
  ? readonly ThreadSafeReturnValueType<ArrayElement>[]
  : T extends Set<infer U>
  ? Set<ThreadSafeReturnValueType<U>>
  : T extends Map<infer K, infer U>
  ? Map<K, ThreadSafeReturnValueType<U>>
  : T extends object
  ? {[K in keyof T]: ThreadSafeReturnValueType<T[K]>}
  : T;

/**
 * Converts an object into the type it could be if accepted as an argument to a function
 * called over a thread.
 */
export type ThreadSafeArgument<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? TypeReturned extends Promise<any>
    ? (...args: Args) => TypeReturned
    : TypeReturned extends AsyncGenerator<any, any, any>
    ? (...args: Args) => TypeReturned
    : TypeReturned extends Generator<infer T, infer R, infer N>
    ? (...args: Args) => AsyncGenerator<T, R, N>
    : TypeReturned extends boolean
    ? (...args: Args) => boolean | Promise<boolean>
    : (...args: Args) => TypeReturned | Promise<TypeReturned>
  : {[K in keyof T]: ThreadSafeArgument<T[K]>};

/**
 * An object that can retain a reference to a `MemoryManageable` object.
 */
export interface MemoryRetainer {
  add(manageable: MemoryManageable): void;
}

/**
 * An object transferred between threads that must have its memory manually managed,
 * in order to release the reference to a corresponding object on the original thread.
 */
export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<MemoryRetainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}

/**
 * An object that can encode and decode values communicated between two threads.
 */
export interface ThreadEncoder {
  /**
   * Encodes a value before sending it to another thread. Should return a tuple where
   * the first item is the encoded value, and the second item is an array of elements
   * that can be transferred to the other thread, instead of being copied.
   */
  encode(value: unknown, api: ThreadEncoderApi): [any, Transferable[]?];

  /**
   * Decodes a value received from another thread.
   */
  decode(
    value: unknown,
    api: ThreadEncoderApi,
    retainedBy?: Iterable<MemoryRetainer>,
  ): unknown;
}

export interface ThreadEncoderApi {
  /**
   * Controls how the thread encoder will handle functions.
   */
  functions?: {
    /**
     * Retrieve a function by its serialized ID. This function will be called while
     * decoding responses from the other "side" of a thread. The implementer of this
     * API should return a proxy function that will call the function on the other
     * thread, or `undefined` to prevent the function from being being decoded.
     */
    get(id: string): AnyFunction | undefined;

    /**
     * Stores a function during encoding. The implementer of this API should return
     * a unique ID for the function, or `undefined` to prevent the function from
     * being encoded.
     */
    add(func: AnyFunction): string | undefined;
  };
}

/**
 * An object that provides a custom process to encode its value.
 */
export interface ThreadEncodable {
  [ENCODE_METHOD](api: {encode(value: any): unknown}): any;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyFunction = Function;

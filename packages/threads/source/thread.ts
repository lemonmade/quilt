import type {
  Thread,
  ThreadTarget,
  ThreadCallable,
  ThreadExposable,
  ThreadEncodingStrategy,
  ThreadEncodingStrategyApi,
  AnyFunction,
} from './types';

import {StackFrame, MemoryRetainer} from './memory';
import {createBasicEncoder} from './encoding/basic';

export interface ThreadOptions<
  Self = Record<string, never>,
  Target = Record<string, never>,
> {
  callable?: (keyof Target)[];
  expose?: ThreadExposable<Self>;
  signal?: AbortSignal;
  uuid?(): string;
  encoder?(api: ThreadEncodingStrategyApi): ThreadEncodingStrategy;
}

const CALL = 0;
const RESULT = 1;
const TERMINATE = 2;
const RELEASE = 3;
const FUNCTION_APPLY = 5;
const FUNCTION_RESULT = 6;

interface MessageMap {
  [CALL]: [string, string | number, any];
  [RESULT]: [string, Error?, any?];
  [TERMINATE]: [];
  [RELEASE]: [string];
  [FUNCTION_APPLY]: [string, string, any];
  [FUNCTION_RESULT]: [string, Error?, any?];
}

export function createThread<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(
  target: ThreadTarget,
  {
    expose,
    callable,
    signal,
    uuid = defaultUuid,
    encoder: createEncoder = createBasicEncoder,
  }: ThreadOptions<Self, Target> = {},
): Thread<Target> {
  let terminated = false;
  const activeApi = new Map<string | number, AnyFunction>();

  if (expose) {
    for (const key of Object.keys(expose)) {
      const value = expose[key as keyof typeof expose];
      if (typeof value === 'function') activeApi.set(key, value);
    }
  }

  const callIdsToResolver = new Map<
    string,
    (
      ...args: MessageMap[typeof FUNCTION_RESULT] | MessageMap[typeof RESULT]
    ) => void
  >();

  const call = createCallable<Target>(handlerForCall, callable);

  const encoder = createEncoder({
    uuid,
    release(id) {
      send(RELEASE, [id]);
    },
    call(id, args, retainedBy) {
      const callId = uuid();
      const done = waitForResult(callId, retainedBy);
      const [encoded, transferables] = encoder.encode(args);

      send(FUNCTION_APPLY, [callId, id, encoded], transferables);

      return done;
    },
  });

  const terminate = () => {
    if (terminated) return;

    for (const id of callIdsToResolver.keys()) {
      resolveCall(id, new ThreadTerminatedError());
    }

    terminated = true;
    activeApi.clear();
    callIdsToResolver.clear();
    encoder.terminate?.();
  };

  signal?.addEventListener(
    'abort',
    () => {
      send(TERMINATE, []);
      terminate();
    },
    {once: true},
  );

  (async () => {
    for await (const message of target.listen({signal})) {
      listener(message);
    }
  })();

  return call;

  function send<Type extends keyof MessageMap>(
    type: Type,
    args: MessageMap[Type],
    transferables?: Transferable[],
  ) {
    if (terminated) return;
    target.send([type, args], transferables);
  }

  async function listener(data: unknown) {
    if (data == null || !Array.isArray(data)) {
      return;
    }

    switch (data[0]) {
      case TERMINATE: {
        terminate();
        break;
      }
      case CALL: {
        const stackFrame = new StackFrame();
        const [id, property, args] = data[1] as MessageMap[typeof CALL];
        const func = activeApi.get(property);

        try {
          if (func == null) {
            throw new Error(
              `No '${property}' method is exposed on this endpoint`,
            );
          }

          const result = func(...(encoder.decode(args, [stackFrame]) as any[]));
          const [encoded, transferables] = await encodeFunctionResult(result);
          send(RESULT, [id, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error as Error;
          send(RESULT, [id, {name, message, stack}]);
        } finally {
          stackFrame.release();
        }

        break;
      }
      case RESULT: {
        resolveCall(...(data[1] as MessageMap[typeof RESULT]));
        break;
      }
      case RELEASE: {
        const [id] = data[1] as MessageMap[typeof RELEASE];
        encoder.release(id);
        break;
      }
      case FUNCTION_RESULT: {
        resolveCall(...(data[1] as MessageMap[typeof FUNCTION_RESULT]));
        break;
      }
      case FUNCTION_APPLY: {
        const [callId, funcId, args] =
          data[1] as MessageMap[typeof FUNCTION_APPLY];

        try {
          const result = encoder.call(funcId, args);
          const [encoded, transferables] = await encodeFunctionResult(result);
          send(FUNCTION_RESULT, [callId, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error as Error;
          send(FUNCTION_RESULT, [callId, {name, message, stack}]);
        }

        break;
      }
    }
  }

  function handlerForCall(property: string | number | symbol) {
    return (...args: any[]) => {
      try {
        if (terminated) {
          throw new ThreadTerminatedError();
        }

        if (typeof property !== 'string' && typeof property !== 'number') {
          throw new Error(
            `Can’t call a symbol method on a thread: ${property.toString()}`,
          );
        }

        const id = uuid();
        const done = waitForResult(id);
        const [encoded, transferables] = encoder.encode(args);

        send(CALL, [id, property, encoded], transferables);

        return done;
      } catch (error) {
        return Promise.reject(error);
      }
    };
  }

  function waitForResult(id: string, retainedBy?: Iterable<MemoryRetainer>) {
    const promise = new Promise<any>((resolve, reject) => {
      callIdsToResolver.set(id, (_, errorResult, value) => {
        if (errorResult == null) {
          resolve(value && encoder.decode(value, retainedBy));
        } else {
          const error = new Error();
          Object.assign(error, errorResult);
          reject(error);
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

  async function encodeFunctionResult(
    result: any,
  ): Promise<[any, Transferable[]?]> {
    if (typeof result !== 'object' || result == null) {
      return encoder.encode(result);
    } else {
      return encoder.encode(await result);
    }
  }

  function resolveCall(...args: MessageMap[typeof RESULT]) {
    const callId = args[0];

    const resolver = callIdsToResolver.get(callId);

    if (resolver) {
      resolver(...args);
      callIdsToResolver.delete(callId);
    }
  }
}

class ThreadTerminatedError extends Error {
  constructor() {
    super('You attempted to call a function on a terminated thread.');
  }
}

function defaultUuid() {
  return `${uuidSegment()}-${uuidSegment()}-${uuidSegment()}-${uuidSegment()}`;
}

function uuidSegment() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

function createCallable<T>(
  handlerForCall: (
    property: string | number | symbol,
  ) => AnyFunction | undefined,
  callable?: (keyof T)[],
): ThreadCallable<T> {
  let call: any;

  if (callable == null) {
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

          const handler = handlerForCall(property);
          cache.set(property, handler);
          return handler;
        },
      },
    );
  } else {
    call = {};

    for (const method of callable) {
      Object.defineProperty(call, method, {
        value: handlerForCall(method),
        writable: false,
        configurable: true,
        enumerable: true,
      });
    }
  }

  return call;
}

import {
  RETAINED_BY,
  RETAIN_METHOD,
  ENCODE_METHOD,
  RELEASE_METHOD,
} from '../constants';
import type {
  ThreadEncodingStrategy,
  ThreadEncodingStrategyApi,
  ThreadEncodable,
  AnyFunction,
} from '../types';
import type {MemoryRetainer} from '../memory';
import {StackFrame, isMemoryManageable} from '../memory';

const FUNCTION = '_@f';
const ASYNC_ITERATOR = '_@i';

export function createBasicEncoder(
  api: ThreadEncodingStrategyApi,
): ThreadEncodingStrategy {
  const functionsToId = new Map<AnyFunction, string>();
  const idsToFunction = new Map<string, AnyFunction>();
  const idsToProxy = new Map<string, AnyFunction>();

  return {
    encode,
    decode,
    call(id, args) {
      const stackFrame = new StackFrame();
      const func = idsToFunction.get(id);

      if (func == null) {
        throw new Error(
          'You attempted to call a function that was already released.',
        );
      }

      const retainedBy = isMemoryManageable(func)
        ? [stackFrame, ...func[RETAINED_BY]]
        : [stackFrame];

      const result = func(...(decode(args, retainedBy) as any[]));

      if (result == null || typeof result.then !== 'function') {
        stackFrame.release();
      }

      return (async () => {
        try {
          const resolved = await result;
          return resolved;
        } finally {
          stackFrame.release();
        }
      })();
    },
    release(id) {
      const func = idsToFunction.get(id);

      if (func) {
        idsToFunction.delete(id);
        functionsToId.delete(func);
      }
    },
    terminate() {
      functionsToId.clear();
      idsToFunction.clear();
      idsToProxy.clear();
    },
  };

  function encode(value: unknown): [any, Transferable[]?] {
    if (typeof value === 'object') {
      if (value == null) {
        return [value];
      }

      const transferables: Transferable[] = [];
      const encodeValue = (value: any) => {
        const [fieldValue, nestedTransferables = []] = encode(value);
        transferables.push(...nestedTransferables);
        return fieldValue;
      };

      if (typeof (value as any)[ENCODE_METHOD] === 'function') {
        const result = (value as ThreadEncodable)[ENCODE_METHOD]({
          encode: encodeValue,
        });

        return [result, transferables];
      }

      if (Array.isArray(value)) {
        const result = value.map((item) => encodeValue(item));
        return [result, transferables];
      }

      const result: Record<string, any> = {};

      for (const key of Object.keys(value)) {
        result[key] = encodeValue((value as any)[key]);
      }

      if (
        (Symbol.asyncIterator in value || Symbol.iterator in value) &&
        typeof (value as any).next === 'function'
      ) {
        result.next ??= encodeValue((value as any).next.bind(value));
        result.return ??= encodeValue((value as any).return.bind(value));
        result.throw ??= encodeValue((value as any).throw.bind(value));
        result[ASYNC_ITERATOR] = true;
      }

      return [result, transferables];
    }

    if (typeof value === 'function') {
      if (functionsToId.has(value)) {
        const id = functionsToId.get(value)!;
        return [{[FUNCTION]: id}];
      }

      const id = api.uuid();

      functionsToId.set(value, id);
      idsToFunction.set(id, value);

      return [{[FUNCTION]: id}];
    }

    return [value];
  }

  function decode(value: unknown, retainedBy?: Iterable<MemoryRetainer>): any {
    if (typeof value === 'object') {
      if (value == null) {
        return value as any;
      }

      if (Array.isArray(value)) {
        return value.map((value) => decode(value, retainedBy));
      }

      if (FUNCTION in value) {
        const id = (value as {[FUNCTION]: string})[FUNCTION];

        if (idsToProxy.has(id)) {
          return idsToProxy.get(id)! as any;
        }

        let retainCount = 0;
        let released = false;

        const release = () => {
          retainCount -= 1;

          if (retainCount === 0) {
            released = true;
            idsToProxy.delete(id);
            api.release(id);
          }
        };

        const retain = () => {
          retainCount += 1;
        };

        const retainers = new Set(retainedBy);

        const proxy = (...args: any[]) => {
          if (released) {
            throw new Error(
              'You attempted to call a function that was already released.',
            );
          }

          if (!idsToProxy.has(id)) {
            throw new Error(
              'You attempted to call a function that was already revoked.',
            );
          }

          return api.call(id, args);
        };

        Object.defineProperties(proxy, {
          [RELEASE_METHOD]: {value: release, writable: false},
          [RETAIN_METHOD]: {value: retain, writable: false},
          [RETAINED_BY]: {value: retainers, writable: false},
        });

        for (const retainer of retainers) {
          retainer.add(proxy as any);
        }

        idsToProxy.set(id, proxy);

        return proxy as any;
      }

      const result: Record<string | symbol, any> = {};

      for (const key of Object.keys(value)) {
        if (key === ASYNC_ITERATOR) {
          result[Symbol.asyncIterator] = () => result;
        } else {
          result[key] = decode((value as any)[key], retainedBy);
        }
      }

      return result;
    }

    return value;
  }
}

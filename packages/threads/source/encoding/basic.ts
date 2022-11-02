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
import {
  StackFrame,
  isBasicObject,
  isMemoryManageable,
  type MemoryRetainer,
} from '../memory';

const FUNCTION = '_@f';
const ASYNC_ITERATOR = '_@i';

export function createBasicEncoderWithOverrides({
  encode: encodeOverride,
  decode: decodeOverride,
}: {
  encode?(
    value: unknown,
    api: ThreadEncodingStrategyApi & Pick<ThreadEncodingStrategy, 'encode'>,
  ): ReturnType<ThreadEncodingStrategy['encode']> | undefined;
  decode?(
    value: unknown,
    retainedBy: Iterable<MemoryRetainer> | undefined,
    api: ThreadEncodingStrategyApi & Pick<ThreadEncodingStrategy, 'decode'>,
  ): unknown;
} = {}) {
  function createBasicEncoder(
    api: ThreadEncodingStrategyApi,
  ): ThreadEncodingStrategy {
    const functionsToId = new Map<AnyFunction, string>();
    const idsToFunction = new Map<string, AnyFunction>();
    const idsToProxy = new Map<string, AnyFunction>();

    const encodeOverrideApi = {...api, encode};
    const decodeOverrideApi = {...api, decode};

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

    type EncodeResult = ReturnType<ThreadEncodingStrategy['encode']>;

    function encode(
      value: unknown,
      seen: Map<any, EncodeResult> = new Map(),
    ): EncodeResult {
      if (value == null) return [value];

      const seenValue = seen.get(value);
      if (seenValue) return seenValue;

      seen.set(value, [undefined]);

      const override = encodeOverride?.(value, encodeOverrideApi);

      if (override !== undefined) {
        seen.set(value, override);
        return override;
      }

      if (typeof value === 'object') {
        const transferables: Transferable[] = [];
        const encodeValue = (value: any) => {
          const [fieldValue, nestedTransferables = []] = encode(value, seen);
          transferables.push(...nestedTransferables);
          return fieldValue;
        };

        if (typeof (value as any)[ENCODE_METHOD] === 'function') {
          const result = (value as ThreadEncodable)[ENCODE_METHOD]({
            encode: encodeValue,
          });

          const fullResult: EncodeResult = [result, transferables];
          seen.set(value, fullResult);

          return [result, transferables];
        }

        if (Array.isArray(value)) {
          const result = value.map((item) => encodeValue(item));
          const fullResult: EncodeResult = [result, transferables];
          seen.set(value, fullResult);

          return fullResult;
        }

        const valueIsIterator = isIterator(value);

        if (isBasicObject(value) || valueIsIterator) {
          const result: Record<string, any> = {};

          for (const key of Object.keys(value)) {
            result[key] = encodeValue((value as any)[key]);
          }

          if (valueIsIterator) {
            result.next ??= encodeValue((value as any).next.bind(value));
            result.return ??= encodeValue((value as any).return.bind(value));
            result.throw ??= encodeValue((value as any).throw.bind(value));
            result[ASYNC_ITERATOR] = true;
          }

          const fullResult: EncodeResult = [result, transferables];
          seen.set(value, fullResult);

          return fullResult;
        }
      }

      if (typeof value === 'function') {
        if (functionsToId.has(value)) {
          const id = functionsToId.get(value)!;
          const result: EncodeResult = [{[FUNCTION]: id}];
          seen.set(value, result);
          return result;
        }

        const id = api.uuid();

        functionsToId.set(value, id);
        idsToFunction.set(id, value);

        const result: EncodeResult = [{[FUNCTION]: id}];
        seen.set(value, result);

        return result;
      }

      const result: EncodeResult = [value];
      seen.set(value, result);

      return result;
    }

    function decode(
      value: unknown,
      retainedBy?: Iterable<MemoryRetainer>,
    ): any {
      const override = decodeOverride?.(value, retainedBy, decodeOverrideApi);

      if (override !== undefined) return override;

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

  return createBasicEncoder;
}

export const createBasicEncoder = createBasicEncoderWithOverrides();

function isIterator(value: any) {
  return (
    value != null &&
    (Symbol.asyncIterator in value || Symbol.iterator in value) &&
    typeof (value as any).next === 'function'
  );
}

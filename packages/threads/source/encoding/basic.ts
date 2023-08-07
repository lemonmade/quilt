import {ENCODE_METHOD} from '../constants.ts';
import type {
  ThreadEncoder,
  ThreadEncoderApi,
  ThreadEncodable,
} from '../types.ts';
import {
  isBasicObject,
  isMemoryManageable,
  type MemoryRetainer,
} from '../memory.ts';

const FUNCTION = '_@f';
const MAP = '_@m';
const SET = '_@s';
const URL_ID = '_@u';
const DATE = '_@d';
const REGEXP = '_@r';
const ASYNC_ITERATOR = '_@i';

/**
 * Creates an encoder that converts most common JavaScript types into a format
 * that can be transferred via message passing.
 */
export function createBasicEncoder(): ThreadEncoder {
  return {
    encode,
    decode,
  };

  type EncodeResult = ReturnType<ThreadEncoder['encode']>;

  function encode(
    value: unknown,
    api: ThreadEncoderApi,
    seen: Map<any, EncodeResult> = new Map(),
  ): EncodeResult {
    if (value == null) return [value];

    const seenValue = seen.get(value);
    if (seenValue) return seenValue;

    seen.set(value, [undefined]);

    if (typeof value === 'object') {
      const transferables: Transferable[] = [];
      const encodeValue = (value: any) => {
        const [fieldValue, nestedTransferables = []] = encode(value, api, seen);
        transferables.push(...nestedTransferables);
        return fieldValue;
      };

      if (typeof (value as any)[ENCODE_METHOD] === 'function') {
        const result = (value as ThreadEncodable)[ENCODE_METHOD]({
          encode: encodeValue,
        });

        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);

        return fullResult;
      }

      if (Array.isArray(value)) {
        const result = value.map((item) => encodeValue(item));
        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);
        return fullResult;
      }

      if (value instanceof RegExp) {
        const result = [{[REGEXP]: [value.source, value.flags]}];
        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);
        return fullResult;
      }

      if (value instanceof URL) {
        const result = [{[URL_ID]: value.href}];
        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);
        return fullResult;
      }

      if (value instanceof Date) {
        const result = [{[DATE]: value.toISOString()}];
        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);
        return fullResult;
      }

      if (value instanceof Map) {
        const entries = [...value.entries()].map(([key, value]) => {
          return [encodeValue(key), encodeValue(value)];
        });
        const result = [{[MAP]: entries}];
        const fullResult: EncodeResult = [result, transferables];
        seen.set(value, fullResult);
        return fullResult;
      }

      if (value instanceof Set) {
        const entries = [...value].map((entry) => encodeValue(entry));
        const result = [{[SET]: entries}];
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
      const id = api.functions?.add(value);

      if (id == null) return [id];

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
    api: ThreadEncoderApi,
    retainedBy?: Iterable<MemoryRetainer>,
  ): any {
    if (typeof value === 'object') {
      if (value == null) {
        return value as any;
      }

      if (Array.isArray(value)) {
        return value.map((value) => decode(value, api, retainedBy));
      }

      if (REGEXP in value) {
        return new RegExp(...(value as {[REGEXP]: [string, string]})[REGEXP]);
      }

      if (URL_ID in value) {
        return new URL((value as {[URL_ID]: string})[URL_ID]);
      }

      if (DATE in value) {
        return new Date((value as {[DATE]: string})[DATE]);
      }

      if (MAP in value) {
        return new Map(
          (value as {[MAP]: [any, any]})[MAP].map(([key, value]) => [
            decode(key, api, retainedBy),
            decode(value, api, retainedBy),
          ]),
        );
      }

      if (SET in value) {
        return new Set(
          (value as {[SET]: any[]})[SET].map((entry) =>
            decode(entry, api, retainedBy),
          ),
        );
      }

      if (FUNCTION in value) {
        const id = (value as {[FUNCTION]: string})[FUNCTION];

        const func = api.functions?.get(id);

        if (retainedBy && isMemoryManageable(func)) {
          for (const retainer of retainedBy) {
            retainer.add(func);
          }
        }

        return func;
      }

      const result: Record<string | symbol, any> = {};

      for (const key of Object.keys(value)) {
        if (key === ASYNC_ITERATOR) {
          result[Symbol.asyncIterator] = () => result;
        } else {
          result[key] = decode((value as any)[key], api, retainedBy);
        }
      }

      return result;
    }

    return value;
  }
}

function isIterator(value: any) {
  return (
    value != null &&
    (Symbol.asyncIterator in value || Symbol.iterator in value) &&
    typeof (value as any).next === 'function'
  );
}

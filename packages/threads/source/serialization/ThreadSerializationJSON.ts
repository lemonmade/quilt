import type {ThreadSerializable} from '../types.ts';
import type {
  AnyThread,
  ThreadSerialization,
  ThreadSerializationOptions,
} from '../Thread.ts';
import {SERIALIZE_METHOD, TRANSFERABLE} from '../constants.ts';

import {isBasicObject, isIterator} from './shared.ts';

const ERROR = '_@e';
const FUNCTION = '_@f';
const MAP = '_@m';
const SET = '_@s';
const URL_ID = '_@u';
const DATE = '_@d';
const REGEXP = '_@r';
const ASYNC_ITERATOR = '_@i';
const UINT8_ARRAY = '_@u8';
const UINT16_ARRAY = '_@u16';
const UINT32_ARRAY = '_@u32';

/**
 * A thread serialization that can transfer an extended set of JavaScript types, by converting
 * them to a simpler, JSON-compatible representation. Aside from the types natively supported
 * by JSON, this serializer can also serialize and deserialize the following types:
 *
 * - `Date`
 * - `Error`
 * - `RegExp`
 * - `Map`
 * - `Set`
 * - `Uint8Array`
 */
export class ThreadSerializationJSON implements ThreadSerialization {
  readonly #customSerializer?: ThreadSerializationOptions['serialize'];
  readonly #customDeserializer?: ThreadSerializationOptions['deserialize'];

  constructor(options?: ThreadSerializationOptions) {
    this.#customSerializer = options?.serialize;
    this.#customDeserializer = options?.deserialize;
  }

  /**
   * Serializes a value into a JSON-compatible format that can be transferred between threads.
   */
  serialize(value: unknown, thread: AnyThread, transferable?: any[]) {
    return this.#serializeInternal(value, thread, transferable);
  }

  #serializeInternal(
    value: unknown,
    thread: AnyThread,
    transferable?: any[],
    seen = new Map<unknown, unknown>(),
    isApplyingDefault = false,
  ): any {
    if (value == null) return value;

    if (seen.has(value)) return seen.get(value);

    // Prevent circular references
    seen.set(value, undefined);

    if (typeof value === 'object') {
      if (this.#customSerializer && !isApplyingDefault) {
        const customValue = this.#customSerializer(
          value,
          (value) =>
            this.#serializeInternal(value, thread, transferable, seen, true),
          thread,
          transferable,
        );

        if (customValue !== undefined) {
          seen.set(value, customValue);
          return customValue;
        }
      }

      if ((value as any)[TRANSFERABLE]) {
        transferable?.push(value as any);
        seen.set(value, value);
        return value;
      }

      const serializeValue = (value: any) => {
        return this.#serializeInternal(value, thread, transferable, seen);
      };

      if (typeof (value as any)[SERIALIZE_METHOD] === 'function') {
        const result = (value as ThreadSerializable)[SERIALIZE_METHOD]({
          serialize: serializeValue,
        });

        seen.set(value, result);

        return result;
      }

      if (Array.isArray(value)) {
        const result = value.map((item) => serializeValue(item));
        seen.set(value, result);
        return result;
      }

      if (value instanceof Error) {
        const result = {
          [ERROR]: {
            name: value.name,
            message: value.message,
            stack: value.stack,
          },
        };
        seen.set(value, result);
        return result;
      }

      if (value instanceof Uint8Array) {
        const result = {[UINT8_ARRAY]: serializeUintArray(value)};
        seen.set(value, result);
        return result;
      }

      if (value instanceof Uint16Array) {
        const result = {[UINT16_ARRAY]: serializeUintArray(value)};
        seen.set(value, result);
        return result;
      }

      if (value instanceof Uint32Array) {
        const result = {[UINT32_ARRAY]: serializeUintArray(value)};
        seen.set(value, result);
        return result;
      }

      if (value instanceof RegExp) {
        const result = {[REGEXP]: [value.source, value.flags]};
        seen.set(value, result);
        return result;
      }

      if (value instanceof URL) {
        const result = {[URL_ID]: value.href};
        seen.set(value, result);
        return result;
      }

      if (value instanceof Date) {
        const result = {[DATE]: value.toISOString()};
        seen.set(value, result);
        return result;
      }

      if (value instanceof Map) {
        const entries = [...value.entries()].map(([key, value]) => {
          return [serializeValue(key), serializeValue(value)];
        });
        const result = {[MAP]: entries};
        seen.set(value, result);
        return result;
      }

      if (value instanceof Set) {
        const entries = [...value].map((entry) => serializeValue(entry));
        const result = {[SET]: entries};
        seen.set(value, result);
        return result;
      }

      const valueIsIterator = isIterator(value);

      if (isBasicObject(value) || valueIsIterator) {
        const result: Record<string, any> = {};

        for (const key of Object.keys(value)) {
          result[key] = serializeValue((value as any)[key]);
        }

        if (valueIsIterator) {
          result.next ??= serializeValue((value as any).next.bind(value));
          result.return ??= serializeValue((value as any).return.bind(value));
          result.throw ??= serializeValue((value as any).throw.bind(value));
          result[ASYNC_ITERATOR] = true;
        }

        seen.set(value, result);

        return result;
      }
    }

    if (typeof value === 'function') {
      const serialized = thread.functions.serialize(
        value as any,
        thread,
        transferable,
      );

      const result = {[FUNCTION]: serialized};

      seen.set(value, result);

      return result;
    }

    seen.set(value, value);

    return value;
  }

  /**
   * Deserializes a JSON-compatible value from another thread.
   */
  deserialize(value: unknown, thread: AnyThread) {
    return this.#deserializeInternal(value, thread);
  }

  #deserializeInternal(
    value: unknown,
    thread: AnyThread,
    isApplyingDefault = false,
  ): any {
    if (value == null) return value;

    if (typeof value === 'object') {
      if (this.#customDeserializer && !isApplyingDefault) {
        const customValue = this.#customDeserializer(
          value,
          (value) => this.#deserializeInternal(value, thread, true),
          thread,
        );

        if (customValue !== undefined) {
          return customValue;
        }
      }

      if (value == null) {
        return value as any;
      }

      if (Array.isArray(value)) {
        return value.map((value) => this.#deserializeInternal(value, thread));
      }

      if (ERROR in value) {
        const serialized = (value as {[ERROR]: any})[ERROR];
        const error = new Error(serialized.message);
        Object.assign(error, serialized);
        return error;
      }

      if (UINT8_ARRAY in value) {
        return deserializeUintArray(
          (value as {[UINT8_ARRAY]: string})[UINT8_ARRAY],
        );
      }

      if (UINT16_ARRAY in value) {
        return new Uint16Array(
          deserializeUintArray(
            (value as {[UINT16_ARRAY]: string})[UINT16_ARRAY],
          ).buffer,
        );
      }

      if (UINT32_ARRAY in value) {
        return new Uint32Array(
          deserializeUintArray(
            (value as {[UINT32_ARRAY]: string})[UINT32_ARRAY],
          ).buffer,
        );
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
            this.#deserializeInternal(key, thread),
            this.#deserializeInternal(value, thread),
          ]),
        );
      }

      if (SET in value) {
        return new Set(
          (value as {[SET]: any[]})[SET].map((entry) =>
            this.#deserializeInternal(entry, thread),
          ),
        );
      }

      if (FUNCTION in value) {
        const func = thread.functions.deserialize(
          (value as {[FUNCTION]: any})[FUNCTION],
          thread,
        );

        return func;
      }

      if (!isBasicObject(value)) {
        return value;
      }

      const result: Record<string | symbol, any> = {};

      for (const key of Object.keys(value)) {
        if (key === ASYNC_ITERATOR) {
          result[Symbol.asyncIterator] = () => result;
        } else {
          result[key] = this.#deserializeInternal((value as any)[key], thread);
        }
      }

      return result;
    }

    return value;
  }
}

function serializeUintArray(array: Uint8Array | Uint16Array | Uint32Array) {
  let binary = '';
  const bytes = new Uint8Array(array.buffer);
  const length = bytes.byteLength;

  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
}

function deserializeUintArray(base64String: string) {
  const binary = atob(base64String);
  const result = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }

  return result;
}

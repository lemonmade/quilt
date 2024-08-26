import type {ThreadSerializable} from '../types.ts';
import type {
  AnyThread,
  ThreadSerialization,
  ThreadSerializationOptions,
} from '../Thread.ts';
import {SERIALIZE_METHOD, TRANSFERABLE} from '../constants.ts';

import {isBasicObject, isIterator} from './shared.ts';

const FUNCTION = '_@f';
const ASYNC_ITERATOR = '_@i';

/**
 * A thread encoder that can transfer supports a wide variety of JavaScript types by
 * converting them to a format that the [`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
 * algorithm can process. This
 *
 * Additionally, this encoder will convert functions into a JSON-friendly representation.
 * These functions will use a manual memory management technique to ensure they can be
 * garbage collected by default, but can be configured to use a `WeakRef`-based automatic
 * memory management system by setting the `garbageCollection: 'weak-ref'` option.
 */
export class ThreadSerializationStructuredClone implements ThreadSerialization {
  readonly #customSerializer?: ThreadSerializationOptions['serialize'];
  readonly #customDeserializer?: ThreadSerializationOptions['deserialize'];

  constructor(options?: ThreadSerializationOptions) {
    this.#customSerializer = options?.serialize;
    this.#customDeserializer = options?.deserialize;
  }

  /**
   * Serializes a value into a structured cloning-compatible format that can be transferred between threads.
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

      if (value instanceof Map) {
        const entries = [...value.entries()].map(([key, value]) => {
          return [serializeValue(key), serializeValue(value)] as const;
        });
        const result = new Map(entries);
        seen.set(value, result);
        return result;
      }

      if (value instanceof Set) {
        const entries = [...value].map((entry) => serializeValue(entry));
        const result = new Set(entries);
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
   * Deserializes a structured cloning-compatible value from another thread.
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

      if (value instanceof Map) {
        return new Map(
          [...value].map(([key, value]) => [
            this.#deserializeInternal(key, thread),
            this.#deserializeInternal(value, thread),
          ]),
        );
      }

      if (value instanceof Set) {
        return new Set(
          [...value].map((entry) => this.#deserializeInternal(entry, thread)),
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

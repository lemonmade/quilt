import {
  RETAINED_BY,
  RETAIN_METHOD,
  RELEASE_METHOD,
  TRANSFERABLE,
} from './constants.ts';
import type {MemoryRetainer, MemoryManageable} from './types.ts';

export {RETAINED_BY, RETAIN_METHOD, RELEASE_METHOD};
export type {MemoryRetainer, MemoryManageable};

/**
 * Marks the value as being transferable between threads. The memory for this object
 * will be moved to the target thread once the object is sent.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
 */
export function markAsTransferable<T = unknown>(value: T) {
  Object.assign(value as any, {[TRANSFERABLE]: true});
  return value;
}

export function isBasicObject(value: unknown) {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype == null || prototype === Object.prototype;
}

import {TRANSFERABLE} from './constants.ts';

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

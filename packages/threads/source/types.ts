import type {
  RELEASE_METHOD,
  RETAIN_METHOD,
  SERIALIZE_METHOD,
  RETAINED_BY,
} from './constants.ts';

/**
 * A mapped object type that takes an object with methods, and converts it into the
 * an object with the same methods that can be called over a thread.
 */

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
 * An object that provides a custom function to serialize its value.
 */
export interface ThreadSerializable {
  [SERIALIZE_METHOD](api: {serialize(value: any): unknown}): any;
}

export type AnyFunction = Function;

export const RETAIN_METHOD = Symbol.for('quilt.threads.retain');
export const RELEASE_METHOD = Symbol.for('quilt.threads.release');
export const RETAINED_BY = Symbol.for('quilt.threads.retained-by');

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
 * A simple representation of a called function. This object allows this library to
 * release references to functions immediately when the function call that transferred
 * them into this thread is completed.
 */
export class StackFrame {
  private readonly memoryManaged = new Set<MemoryManageable>();

  add(memoryManageable: MemoryManageable) {
    this.memoryManaged.add(memoryManageable);
    memoryManageable[RETAINED_BY].add(this);
    memoryManageable[RETAIN_METHOD]();
  }

  release() {
    for (const memoryManaged of this.memoryManaged) {
      memoryManaged[RETAINED_BY].delete(this);
      memoryManaged[RELEASE_METHOD]();
    }

    this.memoryManaged.clear();
  }
}

/**
 * Indicates that a value is being manually memory-managed across threads by this library.
 */
export function isMemoryManageable(value: unknown): value is MemoryManageable {
  return Boolean(
    value && (value as any)[RETAIN_METHOD] && (value as any)[RELEASE_METHOD],
  );
}

/**
 * Marks a value as being used so it will not be automatically released. Calling `retain` will,
 * by default, deeply retain the value — that is, it will traverse into nested array elements
 * and object properties, and retain every `retain`-able thing it finds.
 *
 * You will typically use this alongside also storing that value in a variable that lives outside
 * the context of the function where that value was received.
 *
 * @example
 * import {retain} from '@quilted/threads';
 *
 * const allUsers = new Set<User>();
 *
 * async function sayHello(user: User) {
 *   allUsers.add(user);
 *   retain(user);
 *   return `Hey, ${await user.fullName()}!`;
 * }
 */
export function retain(value: any, {deep = true} = {}): boolean {
  return retainInternal(value, deep, new Map());
}

function retainInternal(
  value: any,
  deep: boolean,
  seen: Map<any, boolean>,
): boolean {
  const seenValue = seen.get(value);
  if (seenValue) return seenValue;

  const canRetain = isMemoryManageable(value);

  if (canRetain) {
    value[RETAIN_METHOD]();
  }

  seen.set(value, canRetain);

  if (deep) {
    if (Array.isArray(value)) {
      const nestedCanRetain = value.reduce(
        (canRetain, item) => retainInternal(item, deep, seen) || canRetain,
        canRetain,
      );

      seen.set(value, nestedCanRetain);
      return nestedCanRetain;
    }

    if (isBasicObject(value)) {
      const nestedCanRetain = Object.keys(value).reduce(
        (canRetain, key) => retainInternal(value[key], deep, seen) || canRetain,
        canRetain,
      );

      seen.set(value, nestedCanRetain);
      return nestedCanRetain;
    }
  }

  return canRetain;
}

/**
 * Once you are no longer using the a `retain`-ed value, you can use this function to mark it as
 * being unused. Like `retain()`, this function will apply to all nested array elements and object
 * properties.
 *
 * @example
 * import {retain} from '@quilted/threads';
 *
 * const allUsers = new Set<User>();
 *
 * function removeUser(user: User) {
 *   allUsers.delete(user);
 *   release(user);
 * }
 */
export function release(value: any, {deep = true} = {}): boolean {
  return releaseInternal(value, deep, new Map());
}

function releaseInternal(
  value: any,
  deep: boolean,
  seen: Map<any, boolean>,
): boolean {
  const seenValue = seen.get(value);
  if (seenValue) return seenValue;

  const canRelease = isMemoryManageable(value);

  if (canRelease) {
    value[RELEASE_METHOD]();
  }

  seen.set(value, canRelease);

  if (deep) {
    if (Array.isArray(value)) {
      const nestedCanRelease = value.reduce(
        (canRelease, item) => releaseInternal(item, deep, seen) || canRelease,
        canRelease,
      );

      seen.set(value, nestedCanRelease);
      return nestedCanRelease;
    }

    if (isBasicObject(value)) {
      const nestedCanRelease = Object.keys(value).reduce(
        (canRelease, key) =>
          releaseInternal(value[key], deep, seen) || canRelease,
        canRelease,
      );

      seen.set(value, nestedCanRelease);
      return nestedCanRelease;
    }
  }

  return canRelease;
}

export function isBasicObject(value: unknown) {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype == null || prototype === Object.prototype;
}

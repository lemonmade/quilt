import type {Import} from './types';

export interface Resolver<T> {
  readonly id?: string;
  readonly resolved?: T;
  resolve(): Promise<T>;
  subscribe(listener: (resolved: T) => void): () => void;
}

export interface ResolverOptions<T> {
  id?(): string;
  load(): Promise<Import<T>>;
}

export function createResolver<T>({id, load}: ResolverOptions<T>): Resolver<T> {
  let resolved: T | undefined;
  let resolvePromise: Promise<T> | undefined;
  let hasTriedSyncResolve = false;
  const resolvedId = id?.();
  const listeners = new Set<(value: T) => void>();

  return {
    get id() {
      return resolvedId;
    },
    get resolved() {
      if (resolved == null && !hasTriedSyncResolve) {
        hasTriedSyncResolve = true;
        resolved = resolvedId ? trySynchronousResolve(resolvedId) : undefined;
      }

      return resolved;
    },
    resolve: async () => {
      resolvePromise = resolvePromise ?? resolve();
      const resolved = await resolvePromise;
      return resolved;
    },
    subscribe(listener: (value: T) => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  async function resolve(): Promise<T> {
    resolved = normalize(await load());

    for (const listener of listeners) {
      listener(resolved!);
    }

    return resolved!;
  }
}

function normalize(module: any) {
  if (module == null) {
    return null;
  }

  const value =
    typeof module === 'object' && 'default' in module ? module.default : module;
  return value == null ? null : value;
}

/* eslint-disable @typescript-eslint/camelcase */
declare const __webpack_require__: (id: string) => any;
declare const __webpack_modules__: {[key: string]: any};
/* eslint-enable @typescript-eslint/camelcase */

// Webpack does not like seeing an explicit require(someVariable) in code
// because that is a dynamic require that it can’t resolve. This code
// obfuscates `require()` for the purpose of fooling Webpack, which is fine
// because we only want to use the `require()` in cases where Webpack
// is not the module bundler.
//
// If we ever reference `require` directly, Webpack complains. So, we first
// check global["require"], which works in Node. However, this doesn’t work
// in Jest when the test is set to simulate a browser, as global in that case
// in a Window object. There, we can only rely on module.require, which is
// actually supposed to be something different but in Jest is the same as
// the global require function.
const requireKey = 'require';
const nodeRequire =
  (typeof global === 'object' &&
    typeof (global as any)[requireKey] === 'function' &&
    (global as any)[requireKey]) ||
  (typeof module === 'object' &&
    typeof module[requireKey] === 'function' &&
    module[requireKey]) ||
  undefined;

// If we have an ID, we try to first use Webpack’s internal stuff
// to resolve the module. If those don’t exist, we know we aren’t
// inside of a Webpack bundle, so we try to use Node’s native resolution
// (which will work in environments like Jest’s test runner).
function tryRequire(id: string) {
  if (
    /* eslint-disable @typescript-eslint/camelcase */
    typeof __webpack_require__ === 'function' &&
    typeof __webpack_modules__ === 'object' &&
    __webpack_modules__[id]
    /* eslint-enable @typescript-eslint/camelcase */
  ) {
    try {
      return normalize(__webpack_require__(id));
    } catch {
      // Just ignore failures
    }
  } else if (typeof nodeRequire === 'function') {
    try {
      return normalize(nodeRequire(id));
    } catch {
      // Just ignore failures
    }
  }

  return undefined;
}

function trySynchronousResolve<T>(id: string): T | undefined {
  return tryRequire(id) ?? undefined;
}

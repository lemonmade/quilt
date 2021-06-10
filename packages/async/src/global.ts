// declare namespace globalThis {
//   declare const foo: string;
// }

declare global {
  const Quilt: {readonly async: AsyncGlobalCache} | undefined;
}

export interface AsyncGlobalCache {
  set<T = unknown>(id: string, module: {default: T}): void;
  get<T = unknown>(id: string): {default: T} | undefined;
}

export function installGlobalCache() {
  const asyncCacheInternal = new Map<string, {default: any}>();

  const asyncCache: AsyncGlobalCache = {
    get(id) {
      return asyncCacheInternal.get(id);
    },
    set(id, module) {
      asyncCacheInternal.set(id, module);
    },
  };

  Reflect.defineProperty(globalThis, 'Quilt', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: {
      async: asyncCache,
    },
  });
}

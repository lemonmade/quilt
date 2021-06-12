export interface AsyncLoader<T> {
  readonly id?: string;
  readonly loaded?: T;
  load(): Promise<T>;
  subscribe(listener: (loaded: T) => void): () => void;
}

export interface AsyncLoaderLoad<T> {
  (): Promise<{default: T}>;
}

export interface AsyncLoaderOptions {
  id?(): string;
}

export function createAsyncLoader<T>(
  load: AsyncLoaderLoad<T>,
  {id}: AsyncLoaderOptions = {},
): AsyncLoader<T> {
  let resolved: T | undefined;
  let resolvePromise: Promise<T> | undefined;
  let hasTriedSyncResolve = false;

  const resolvedId = id?.();
  const listeners = new Set<(value: T) => void>();

  return {
    get id() {
      return resolvedId;
    },
    get loaded() {
      if (resolved == null && resolvedId && !hasTriedSyncResolve) {
        hasTriedSyncResolve = true;
        resolved =
          typeof Quilt === 'object'
            ? normalize(Quilt.AsyncAssets?.get<{default: T}>(resolvedId))
            : undefined;
      }

      return resolved;
    },
    load: async () => {
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
    return undefined;
  }

  const value =
    typeof module === 'object' && 'default' in module ? module.default : module;
  return value == null ? undefined : value;
}

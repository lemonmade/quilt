import type {Import} from './types';

export interface Resolver<T> {
  readonly id?: string;
  readonly resolved?: T;
  resolve(): Promise<T>;
  subscribe(listener: (resolved: T) => void): () => void;
}

export interface ResolverOptions<T> {
  load(): Promise<Import<T>>;
  id?(): string;
  get?(id: string): any;
}

export function createResolver<T>({
  id,
  get,
  load,
}: ResolverOptions<T>): Resolver<T> {
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
        resolved = resolvedId
          ? trySynchronousResolve(resolvedId, get)
          : undefined;
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

function trySynchronousResolve<T>(
  id: string,
  get?: (id: string) => any,
): T | undefined {
  return normalize(get?.(id));
}

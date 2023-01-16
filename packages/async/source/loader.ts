import type {AsyncAssetsGlobal} from './global';

declare const Quilt: {readonly AsyncAssets: AsyncAssetsGlobal} | undefined;

export interface AsyncModule<Module = Record<string, unknown>> {
  readonly id?: string;
  readonly loaded?: Module;
  load(): Promise<Module>;
  subscribe(
    listener: (loaded: Module) => void,
    options?: {signal?: AbortSignal},
  ): void;
}

export interface AsyncModuleLoad<Module = Record<string, unknown>> {
  (): Promise<Module>;
}

export interface AsyncModuleOptions {
  id?(): string;
}

export function createAsyncModule<Module = Record<string, unknown>>(
  load: AsyncModuleLoad<Module>,
  {id}: AsyncModuleOptions = {},
): AsyncModule<Module> {
  let resolved: Module | undefined;
  let resolvePromise: Promise<Module> | undefined;
  let hasTriedSyncResolve = false;

  const resolvedId = id?.();
  const listeners = new Set<(value: Module) => void>();

  return {
    get id() {
      return resolvedId;
    },
    get loaded() {
      if (resolved == null && resolvedId && !hasTriedSyncResolve) {
        hasTriedSyncResolve = true;
        resolved =
          typeof Quilt === 'object'
            ? Quilt.AsyncAssets?.get<Module>(resolvedId)
            : undefined;
      }

      return resolved;
    },
    load: async () => {
      resolvePromise = resolvePromise ?? resolve();
      const resolved = await resolvePromise;
      return resolved;
    },
    subscribe(listener, {signal} = {}) {
      listeners.add(listener);

      signal?.addEventListener(
        'abort',
        () => {
          listeners.delete(listener);
        },
        {once: true},
      );
    },
  };

  async function resolve(): Promise<Module> {
    resolved = await load();

    for (const listener of listeners) {
      listener(resolved!);
    }

    return resolved!;
  }
}

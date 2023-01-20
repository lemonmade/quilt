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

export interface AsyncModuleLoadFunction<Module = Record<string, unknown>> {
  (): Promise<Module>;
}
export interface AsyncModuleLoadObject<Module = Record<string, unknown>> {
  readonly id?: string;
  import(): Promise<Module>;
}

export type AsyncModuleLoad<Module = Record<string, unknown>> =
  | AsyncModuleLoadFunction<Module>
  | AsyncModuleLoadObject<Module>;

export function createAsyncModule<Module = Record<string, unknown>>(
  load: AsyncModuleLoad<Module>,
): AsyncModule<Module> {
  let resolved: Module | undefined;
  let resolvePromise: Promise<Module> | undefined;
  let hasTriedSyncResolve = false;

  const id = (load as any).id;
  const listeners = new Set<(value: Module) => void>();

  return {
    id,
    get loaded() {
      if (resolved == null && id && !hasTriedSyncResolve) {
        hasTriedSyncResolve = true;
        resolved =
          typeof Quilt === 'object'
            ? Quilt.AsyncAssets?.get<Module>(id)
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
    resolved = typeof load === 'function' ? await load() : await load.import();

    for (const listener of listeners) {
      listener(resolved!);
    }

    return resolved!;
  }
}

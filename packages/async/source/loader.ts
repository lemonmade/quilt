import {createEmitter, type Emitter} from '@quilted/events';

export interface AsyncModule<Module = Record<string, unknown>>
  extends Pick<Emitter<{resolve: Error | Module}>, 'on'> {
  readonly id?: string;
  readonly loaded?: Module;
  load(): Promise<Module>;
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
  const emitter = createEmitter<{resolve: Error | Module}>();

  return {
    id,
    get loaded() {
      return getResolved();
    },
    load: async () => {
      let resolved = getResolved();
      if (resolved != null) return resolved;
      resolvePromise = resolvePromise ?? resolve();
      resolved = await resolvePromise;
      return resolved;
    },
    on: emitter.on,
  };

  function getResolved() {
    if (!hasTriedSyncResolve && resolved == null && id) {
      hasTriedSyncResolve = true;
      resolved = (globalThis as any)[Symbol.for('quilt')]?.AsyncModules?.get(
        id,
      );
    }

    return resolved;
  }

  async function resolve(): Promise<Module> {
    try {
      resolved =
        typeof load === 'function' ? await load() : await load.import();
      emitter.emit('resolve', resolved);
      resolvePromise = undefined;
      return resolved!;
    } catch (error) {
      emitter.emit('resolve', error as Error);
      resolvePromise = undefined;
      throw error;
    }
  }
}

import {signal} from '@quilted/signals';
import {
  runAsync,
  type AsyncOperation,
  type AsyncOperationStatus,
} from './operation.ts';

export interface AsyncModule<Module = Record<string, unknown>> {
  readonly id?: string;
  readonly status: AsyncOperationStatus | 'inactive';
  readonly module?: Module;
  readonly cause?: unknown;
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
  const id = (load as any).id;
  const preloadedModule = (globalThis as any)[
    Symbol.for('quilt')
  ]?.AsyncModules?.get(id);

  if (preloadedModule) {
    return {
      id,
      status: 'resolved',
      module: preloadedModule,
      load: () => Promise.resolve(preloadedModule),
    };
  }

  const operation = signal<AsyncOperation<Promise<Module>> | undefined>(
    undefined,
  );

  return {
    id,
    get module() {
      return operation.value?.value.value;
    },
    get status() {
      const currentOperation = operation.value;
      return currentOperation ? currentOperation.status.value : 'inactive';
    },
    get cause() {
      return operation.value?.cause.value;
    },
    async load() {
      let currentOperation = operation.value;

      if (currentOperation == null) {
        currentOperation = runAsync(() =>
          typeof load === 'function' ? load() : load.import(),
        );
        operation.value = currentOperation;
      }

      await currentOperation.promise;

      console.log({
        type: 'FINISHED_ASYNC_MODULE_LOAD',
        id,
        status: currentOperation.status.value,
      });

      if (currentOperation.status.value === 'resolved') {
        return currentOperation.value.value!;
      } else {
        throw currentOperation.cause.value;
      }
    },
  };
}

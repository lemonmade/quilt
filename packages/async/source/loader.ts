import {AsyncOperation} from './operation.ts';

export class AsyncModule<Module> extends AsyncOperation<Module> {
  readonly id?: string;

  get exported() {
    return this.value;
  }

  import = (...args: Parameters<AsyncOperation<Module>['run']>) =>
    this.isRunning ? this.promise : this.run(...args);

  constructor(load: AsyncModuleLoad<Module>) {
    const id = (load as any).id;
    const preloadedModule = (globalThis as any)[
      Symbol.for('quilt')
    ]?.AsyncModules?.get(id);

    super(() => (typeof load === 'function' ? load() : load.import()), {
      initial: preloadedModule,
    });

    this.id = id;
  }
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
  return new AsyncModule(load);
}

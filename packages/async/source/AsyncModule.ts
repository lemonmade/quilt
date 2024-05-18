import {AsyncFetch} from './AsyncFetch.ts';

export interface AsyncModuleLoaderFunction<Module> {
  (): Promise<Module>;
}

export interface AsyncModuleLoaderObject<Module> {
  readonly id?: string;
  import(): Promise<Module>;
}

export type AsyncModuleLoader<Module> =
  | AsyncModuleLoaderFunction<Module>
  | AsyncModuleLoaderObject<Module>;

export class AsyncModule<Module> {
  readonly id?: string;

  get module() {
    return this.fetchModule.value;
  }

  get value() {
    return this.fetchModule.value;
  }

  get error() {
    return this.fetchModule.error;
  }

  get promise() {
    return this.fetchModule.promise;
  }

  get status() {
    return this.fetchModule.status;
  }

  get isLoading() {
    return this.fetchModule.isRunning;
  }

  private readonly fetchModule: AsyncFetch<Module>;

  constructor(load: AsyncModuleLoader<Module>) {
    const id = (load as any).id;
    this.id = id;

    const preloadedModule = (globalThis as any)[
      Symbol.for('quilt')
    ]?.asyncModules?.get(id);

    this.fetchModule = new AsyncFetch(
      () => (typeof load === 'function' ? load() : load.import()),
      {initial: preloadedModule},
    );
  }

  load = ({force = false} = {}) =>
    !force && (this.isLoading || this.status !== 'pending')
      ? this.promise
      : this.fetchModule.call();

  import = this.load;
}

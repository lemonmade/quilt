import {AsyncAction} from './AsyncAction.ts';

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
    return this.loadAction.value;
  }

  get value() {
    return this.loadAction.value;
  }

  get error() {
    return this.loadAction.error;
  }

  get promise() {
    return this.loadAction.promise;
  }

  get status() {
    return this.loadAction.status;
  }

  get isLoading() {
    return this.loadAction.isRunning;
  }

  private readonly loadAction: AsyncAction<Module>;

  constructor(load: AsyncModuleLoader<Module>) {
    const id = (load as any).id;
    this.id = id;

    const preloadedModule = (globalThis as any)[
      Symbol.for('quilt')
    ]?.asyncModules?.get(id);

    this.loadAction = new AsyncAction(
      () => (typeof load === 'function' ? load() : load.import()),
      {initial: preloadedModule},
    );
  }

  load = ({force = false} = {}) =>
    !force && (this.isLoading || this.status !== 'pending')
      ? this.promise
      : this.loadAction.run();

  import = this.load;
}

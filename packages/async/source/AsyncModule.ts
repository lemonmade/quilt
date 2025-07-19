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
  static from<Module>(load: AsyncModuleLoader<Module>) {
    return new AsyncModule(load);
  }

  readonly id?: string;

  get module() {
    return this.loadModule.value;
  }

  get value() {
    return this.loadModule.value;
  }

  get error() {
    return this.loadModule.error;
  }

  get promise() {
    return this.loadModule.promise;
  }

  get status() {
    return this.loadModule.status;
  }

  get isLoading() {
    return this.loadModule.isRunning;
  }

  private readonly loadModule: AsyncAction<Module>;

  constructor(
    load: AsyncModuleLoader<Module>,
    {cached}: {cached?: Module} = {},
  ) {
    const id = (load as any).id;
    this.id = id;

    this.loadModule = new AsyncAction(
      () => (typeof load === 'function' ? load() : load.import()),
      {cached: cached ? {value: cached} : undefined},
    );
  }

  load = ({force = false} = {}) =>
    !force && (this.isLoading || this.status !== 'pending')
      ? this.promise
      : this.loadModule.run();

  import = this.load;
}

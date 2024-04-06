export interface CustomWorker extends Worker {
  readonly url?: URL;
  readonly signal: AbortSignal;
}

export interface CustomWorkerConstructor {
  new (): CustomWorker;
}

export type CustomWorkerModuleResolver<T = unknown> =
  | (() => Promise<T>)
  | ({source: string} & WorkerOptions)
  | string;

const BaseWorker =
  typeof Worker === 'undefined'
    ? (class FakeWorker {} as typeof Worker)
    : Worker;

export function createWorker(
  moduleResolver: CustomWorkerModuleResolver<any>,
): CustomWorkerConstructor {
  const resolvedWorkerModule = resolveWorkerModule(moduleResolver);
  const workerURL =
    resolvedWorkerModule && getSameOriginWorkerUrl(resolvedWorkerModule.url);

  class Worker extends BaseWorker implements Disposable {
    readonly url = workerURL;

    private readonly abort = new AbortController();
    readonly signal = this.abort.signal;
    readonly [Symbol.dispose]!: () => void;

    constructor() {
      super(workerURL!, resolvedWorkerModule?.options);

      if (workerURL && workerURL.href !== resolvedWorkerModule?.url.href) {
        this.signal.addEventListener(
          'abort',
          () => {
            URL.revokeObjectURL(workerURL.href);
          },
          {once: true},
        );
      }

      if (Symbol.dispose) {
        this[Symbol.dispose] = () => {
          this.terminate();
        };
      }
    }

    terminate() {
      this.abort.abort();
      super.terminate();
    }
  }

  return Worker;
}

function resolveWorkerModule(moduleResolver: CustomWorkerModuleResolver<any>) {
  if (typeof window === 'undefined') return undefined;

  if (typeof moduleResolver === 'string') {
    return {url: new URL(moduleResolver, window.location.href)};
  }

  if ('source' in moduleResolver) {
    const {source, ...options} = moduleResolver;
    return {url: new URL(source, window.location.href), options};
  }

  return undefined;
}

function getSameOriginWorkerUrl(url: URL) {
  return typeof window === 'undefined' || url.origin === window.location.origin
    ? url
    : new URL(
        URL.createObjectURL(
          new Blob([`importScripts(${JSON.stringify(url.href)})`]),
        ),
      );
}

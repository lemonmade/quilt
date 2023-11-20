export interface CustomWorker extends Worker {
  readonly url?: URL;
  readonly signal: AbortSignal;
}

export interface CustomWorkerConstructor {
  new (): CustomWorker;
}

export type CustomWorkerModuleResolver<T = unknown> =
  | (() => Promise<T>)
  | string;

const BaseWorker =
  typeof Worker === 'undefined'
    ? (class FakeWorker {} as typeof Worker)
    : Worker;

export function createWorker(
  script: CustomWorkerModuleResolver<any>,
): CustomWorkerConstructor {
  const scriptURL = createScriptUrl(script);
  const workerURL = scriptURL && getSameOriginWorkerUrl(scriptURL);

  class Worker extends BaseWorker {
    readonly url = workerURL;

    private readonly abort = new AbortController();
    readonly signal = this.abort.signal;

    constructor() {
      super(workerURL!);

      if (workerURL && workerURL.href !== scriptURL?.href) {
        this.signal.addEventListener(
          'abort',
          () => {
            URL.revokeObjectURL(workerURL.href);
          },
          {once: true},
        );
      }
    }

    terminate() {
      this.abort.abort();
      super.terminate();
    }
  }

  return Worker;
}

function createScriptUrl(script: CustomWorkerModuleResolver<any>) {
  return typeof window === 'undefined' || typeof script !== 'string'
    ? undefined
    : new URL(script, window.location.href);
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

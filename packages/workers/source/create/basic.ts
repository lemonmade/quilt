import {
  createScriptUrl,
  getSameOriginWorkerUrl,
  type FileOrModuleResolver,
} from './utilities.ts';

export interface BasicWorkerCreator {
  readonly url?: URL;
  (): Worker;
}

export function createWorker(
  script: FileOrModuleResolver<unknown>,
): BasicWorkerCreator {
  const scriptUrl = createScriptUrl(script);

  function createWorker(): Worker {
    if (scriptUrl) {
      const workerUrl = getSameOriginWorkerUrl(scriptUrl);

      const worker = new Worker(workerUrl);

      if (workerUrl.href !== scriptUrl.href) {
        const originalTerminate = worker.terminate.bind(worker);
        worker.terminate = () => {
          URL.revokeObjectURL(workerUrl.href);
          originalTerminate();
        };
      }

      return worker;
    }

    // We can’t create a worker without a browser environment,
    // so we return a proxy that just does nothing.
    return new Proxy(
      {},
      {
        get(_target, _property) {
          return () => {
            throw new Error(
              'You can’t call a method on a worker on the server.',
            );
          };
        },
      },
    ) as any;
  }

  Reflect.defineProperty(createWorker, 'url', {
    value: scriptUrl,
  });

  return createWorker as any;
}

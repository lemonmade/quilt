import {createThreadFromWebWorker} from '@quilted/threads';
import type {Thread, ThreadOptions} from '@quilted/threads';

import {
  createScriptUrl,
  getSameOriginWorkerUrl,
  type FileOrModuleResolver,
} from './utilities.ts';

export interface ThreadWorkerCreator<Self, Target> {
  readonly url?: URL;
  (options?: ThreadOptions<Self, Target>): Thread<Target>;
}

export function createThreadWorker<Self = unknown, Target = unknown>(
  script: FileOrModuleResolver<Target>,
): ThreadWorkerCreator<Self, Target> {
  const scriptUrl = createScriptUrl(script);

  function createWorker(options?: ThreadOptions<Self, Target>): Thread<Target> {
    if (scriptUrl) {
      return createThreadFromWebWorker(
        createWebWorker(scriptUrl, options),
        options,
      );
    }

    // The babel plugin that comes with this package actually turns the argument
    // into a string (the public path of the worker script). If it’s a function,
    // it’s because we’re in an environment where we didn’t transform it into a
    // worker. In that case, we can use the fact that we will get access to the
    // real module and pretend to be a worker that way.
    if (typeof script === 'function') {
      return new Proxy(
        {},
        {
          get(_target, property) {
            return async (...args: any[]) => {
              const module = await script();
              return (module as any)[property](...args);
            };
          },
        },
      ) as any;
    }

    // If we aren’t in an environment that supports Workers, just bail out
    // with a stand-in worker that throws for every method call.
    if (typeof window === 'undefined') {
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

    throw new Error('Could not create a suitable fallback');
  }

  Reflect.defineProperty(createWorker, 'url', {
    value: scriptUrl,
  });

  return createWorker as any;
}

function createWebWorker(
  url: URL,
  {signal}: {signal?: AbortSignal} = {},
): Worker {
  const workerUrl = getSameOriginWorkerUrl(url);
  const worker = new Worker(workerUrl);

  if (workerUrl.href !== url.href) {
    signal?.addEventListener(
      'abort',
      () => {
        URL.revokeObjectURL(workerUrl.href);
      },
      {once: true},
    );
  }

  return worker;
}

import {ThreadWebWorker} from '@quilted/threads';
import type {Thread, ThreadOptions, ThreadImports} from '@quilted/threads';

import {
  createWorker,
  type CustomWorker,
  type CustomWorkerModuleResolver,
} from './basic.ts';

export interface CustomThreadWorker<Target, Self> extends CustomWorker {
  readonly url?: URL;
  readonly thread: Thread<Target, Self>;
  readonly imports: ThreadImports<Target>;
}

export interface CustomThreadWorkerConstructor<Target, Self> {
  new (options?: ThreadOptions<Target, Self>): CustomThreadWorker<Target, Self>;
}

export function createThreadWorker<Self = unknown, Target = unknown>(
  moduleResolver: CustomWorkerModuleResolver<Target>,
): CustomThreadWorkerConstructor<Target, Self> {
  const CustomWorker = createWorker(moduleResolver);

  class ThreadWorker extends CustomWorker {
    readonly thread: Thread<Target, Self>;
    readonly imports: ThreadImports<Target>;

    constructor(options?: ThreadOptions<Target, Self>) {
      super();

      if (this.url) {
        this.thread = new ThreadWebWorker(this, {
          signal: this.signal,
          ...options,
        });
      } else {
        this.thread = {
          imports: new Proxy(
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
          ),
        } as any;
      }

      this.imports = this.thread.imports;
    }
  }

  return ThreadWorker;
}

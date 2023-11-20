import {createThreadFromWebWorker} from '@quilted/threads';
import type {Thread, ThreadOptions} from '@quilted/threads';

import {
  createWorker,
  type CustomWorker,
  type CustomWorkerModuleResolver,
} from './basic.ts';

export interface CustomThreadWorker<_Self, Target> extends CustomWorker {
  readonly url?: URL;
  readonly thread: Thread<Target>;
}

export interface CustomThreadWorkerConstructor<Self, Target> {
  new (options?: ThreadOptions<Self, Target>): CustomThreadWorker<Self, Target>;
}

export function createThreadWorker<Self = unknown, Target = unknown>(
  script: CustomWorkerModuleResolver<Target>,
): CustomThreadWorkerConstructor<Self, Target> {
  const CustomWorker = createWorker(script);

  class ThreadWorker extends CustomWorker {
    readonly thread: Thread<Target>;

    constructor(options?: ThreadOptions<Self, Target>) {
      super();

      if (this.url) {
        this.thread = createThreadFromWebWorker(this, {
          signal: this.signal,
          ...options,
        });
      } else {
        this.thread = new Proxy(
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
    }
  }

  return ThreadWorker;
}

const MyThreadWorker = createThreadWorker<{}, {foo(): string}>(
  'https://foo.com/worker.js',
);

const worker = new MyThreadWorker({});
worker.thread.foo();

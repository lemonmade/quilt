import {Thread, type ThreadOptions} from '../Thread.ts';
import {portToMessageTarget} from './ThreadMessagePort.ts';

/**
 * Creates a thread from a web worker. This function can be used either from a JavaScript
 * environment that *created* a web worker, or from within a web worker that has been
 * created.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
 *
 * @example
 * import {ThreadWebWorker} from '@quilted/threads';
 *
 * // If inside a web worker:
 * const thread = new ThreadWebWorker(self, {
 *   exports: {
 *     async sendMessage(message) {
 *      console.log(message);
 *     },
 *   },
 * });
 *
 * // If in an environment that creates a worker:
 * const worker = new Worker('worker.js');
 * const thread = new ThreadWebWorker(worker);
 *
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadWebWorker<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly worker: Worker;

  static from<Imports = Record<string, never>, Exports = Record<string, never>>(
    worker: Worker,
    options?: ThreadOptions<Imports, Exports>,
  ) {
    return new ThreadWebWorker<Imports, Exports>(worker, options);
  }

  /**
   * Starts a thread wrapped around a `Worker` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadWebWorker} from '@quilted/threads';
   *
   * // On the main thread:
   * const worker = new Worker('worker.js');
   * const {getMessage} = ThreadWebWorker.import(worker);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // Inside a web worker:
   *
   * import {ThreadWebWorker} from '@quilted/threads';
   *
   * ThreadWebWorker.export(self, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static import<Imports = Record<string, never>>(
    worker: Worker,
    options?: Omit<ThreadOptions<Imports, Record<string, never>>, 'imports'>,
  ) {
    return new ThreadWebWorker<Imports>(worker, options).imports;
  }

  /**
   * Starts a thread wrapped around a `Worker` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadWebWorker} from '@quilted/threads';
   *
   * // Inside a web worker:
   * ThreadWebWorker.export(self, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // On the main thread:
   *
   * import {ThreadWebWorker} from '@quilted/threads';
   *
   * const worker = new Worker('worker.js');
   * const {getMessage} = ThreadWebWorker.import(worker);
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    worker: Worker,
    exports: Exports,
    options?: Omit<ThreadOptions<Record<string, never>, Exports>, 'exports'>,
  ) {
    new ThreadWebWorker(worker, {...options, exports});
  }

  static self = Object.assign(
    <Imports = Record<string, never>, Exports = Record<string, never>>(
      options?: ThreadOptions<Imports, Exports>,
    ) => this.from(selfAsWorker(), options),
    {
      import: <Imports = Record<string, never>>(
        options?: Omit<
          ThreadOptions<Imports, Record<string, never>>,
          'imports'
        >,
      ) => this.import(selfAsWorker(), options),
      export: <Exports = Record<string, never>>(
        exports: Exports,
        options?: Omit<
          ThreadOptions<Record<string, never>, Exports>,
          'exports'
        >,
      ) => this.export(selfAsWorker(), exports, options),
    },
  );

  constructor(worker: Worker, options?: ThreadOptions<Imports, Exports>) {
    super(portToMessageTarget(worker), options);
    this.worker = worker;
  }
}

function selfAsWorker() {
  if (typeof self === 'undefined' || !(self instanceof Worker)) {
    throw new Error('You are not inside a web worker.');
  }

  return self as unknown as Worker;
}

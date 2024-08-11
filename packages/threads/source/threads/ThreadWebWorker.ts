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
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly worker: Worker;

  constructor(worker: Worker, options?: ThreadOptions<Target, Self>) {
    super(portToMessageTarget(worker), options);
    this.worker = worker;
  }
}

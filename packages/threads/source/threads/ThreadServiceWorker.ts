import {Thread, type ThreadOptions} from '../Thread.ts';

import {portToMessageTarget} from './ThreadMessagePort.ts';

/**
 * Creates a thread from a service worker. This function can be used either from a JavaScript
 * environment that *created* a service worker, which is typically a top-level HTML page. To
 * create threads between a service worker and an individual client, use
 * `ThreadsFromServiceWorkerClients` instead.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
 *
 * @example
 * import {ThreadServiceWorker} from '@quilted/threads';
 *
 * const registration = await navigator.serviceWorker.register('worker.js');
 * const serviceWorker = registration.installing ?? registration.waiting ?? registration.active;
 * const thread = new ThreadServiceWorker(serviceWorker);
 *
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadServiceWorker<
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly worker: ServiceWorker;

  constructor(worker: ServiceWorker, options?: ThreadOptions<Target, Self>) {
    super(portToMessageTarget(worker), options);
    this.worker = worker;
  }
}

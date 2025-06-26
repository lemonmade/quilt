import {Thread, type ThreadOptions} from '../Thread.ts';

import {portToMessageTarget} from './ThreadMessagePort.ts';

/**
 * Creates a thread from a service worker. This function can be used from a JavaScript
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
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly worker: ServiceWorker;

  /**
   * Starts a thread wrapped around a `ServiceWorker` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadServiceWorker} from '@quilted/threads';
   *
   * // On the main thread:
   *
   * const registration = await navigator.serviceWorker.register('worker.js');
   * const serviceWorker = registration.installing ?? registration.waiting ?? registration.active;
   * const {getMessage} = ThreadServiceWorker.import(serviceWorker);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // In your service worker:
   *
   * import {ThreadServiceWorkerClients} from '@quilted/threads';
   *
   * ThreadServiceWorkerClients.export({
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static import<Imports = Record<string, never>>(
    worker: ServiceWorker,
    options?: Omit<ThreadOptions<Imports, Record<string, never>>, 'imports'>,
  ) {
    return new ThreadServiceWorker<Imports>(worker, options).imports;
  }

  /**
   * Starts a thread wrapped around a `ServiceWorker` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadServiceWorker} from '@quilted/threads';
   *
   * // On the main thread:
   *
   * const registration = await navigator.serviceWorker.register('worker.js');
   * const serviceWorker = registration.installing ?? registration.waiting ?? registration.active;
   * ThreadServiceWorker.export(serviceWorker, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // In your service worker:
   *
   * import {ThreadServiceWorkerClients} from '@quilted/threads';
   *
   * const threads = new ThreadServiceWorkerClients();
   *
   * serviceWorker.addEventListener('message', (event) => {
   *   const source = event.source;
   *   const {getMessage} = threads.get(source).imports;
   *   const message = await getMessage(); // 'Hello, world!'
   * });
   * ```
   */
  static export<Exports = Record<string, never>>(
    worker: ServiceWorker,
    exports: Exports,
    options?: Omit<ThreadOptions<Record<string, never>, Exports>, 'exports'>,
  ) {
    new ThreadServiceWorker(worker, {...options, exports});
  }

  constructor(
    worker: ServiceWorker,
    options?: ThreadOptions<Imports, Exports>,
  ) {
    super(portToMessageTarget(worker), options);
    this.worker = worker;
  }
}

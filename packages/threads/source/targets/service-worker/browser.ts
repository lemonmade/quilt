import {createThreadFromWebWorker} from '../web-worker.ts';

/**
 * Creates a thread from a service worker. This function can be used either from a JavaScript
 * environment that *created* a service worker, which is typically a top-level HTML page. To
 * create threads between a service worker and an individual client, use
 * `createThreadsFromServiceWorkerClients` instead.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
 *
 * @example
 * import {createThreadFromServiceWorker} from '@quilted/threads';
 *
 * const registration = await navigator.serviceWorker.register('worker.js');
 * const serviceWorker = registration.installing ?? registration.waiting ?? registration.active;
 * const thread = createThreadFromServiceWorker(serviceWorker);
 *
 * await thread.sendMessage('Hello world!');
 */
export const createThreadFromServiceWorker = createThreadFromWebWorker;

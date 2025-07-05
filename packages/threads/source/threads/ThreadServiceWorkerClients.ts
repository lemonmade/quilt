import {Thread, type ThreadOptions} from '../Thread.ts';

export type ServiceWorkerMessageSource = NonNullable<
  ExtendableMessageEvent['source']
>;

export interface ThreadServiceWorkerClientsOptions<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends ThreadOptions<Imports, Exports> {
  include?(source: ServiceWorkerMessageSource): boolean;
}

/**
 * Starts an object within a service worker that will listen for new clients connecting,
 * and immediately create a thread around each client. You can then call the `get()`, `create()`,
 * and `delete()` methods to retrieve the threads for a given client.
 *
 * @example
 * import {ThreadServiceWorkerClients} from '@quilted/threads';
 *
 * const threads = new ThreadServiceWorkerClients();
 *
 * addEventListener('message', (event) => {
 *   const source = event.source;
 *   const thread = threads.get(source);
 *   const message = await thread.imports.getMessage();
 * });
 */
export class ThreadServiceWorkerClients<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> {
  /**
   * Starts a listening for new clients connecting to the service worker, and
   * creates a thread around each, with the second argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadServiceWorker} from '@quilted/threads';
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
   *
   * // On the main thread:
   *
   * const registration = await navigator.serviceWorker.register('worker.js');
   * const serviceWorker = registration.installing ?? registration.waiting ?? registration.active;
   * const {getMessage} = ThreadServiceWorker.import(serviceWorker);
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    exports: Exports,
    options?: Omit<
      ThreadServiceWorkerClientsOptions<Record<string, never>, Exports>,
      'exports'
    >,
  ) {
    new ThreadServiceWorkerClients({...options, exports});
  }

  #threads = new WeakMap<
    ServiceWorkerMessageSource,
    Thread<Imports, Exports>
  >();
  #listeners = new WeakMap<
    ServiceWorkerMessageSource,
    (value: unknown) => void
  >();
  #options: ThreadServiceWorkerClientsOptions<Imports, Exports>;

  constructor(
    options: ThreadServiceWorkerClientsOptions<Imports, Exports> = {},
  ) {
    const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

    serviceWorker.addEventListener('message', (event) => {
      const source = event.source;

      if (source == null) return;
      if (options.include != null && !options.include(source)) return;

      this.#createForClient(source);

      this.#listeners.get(source)?.(event.data);
    });

    this.#options = options;
  }

  get(
    client: ServiceWorkerMessageSource,
  ): Thread<Imports, Exports> | undefined {
    return this.#threads.get(client);
  }

  delete(client: ServiceWorkerMessageSource): boolean {
    return this.#threads.delete(client);
  }

  from(
    client: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Imports, Exports>,
  ): Thread<Imports, Exports> {
    return this.#createForClient(client, overrideOptions);
  }

  export(
    client: ServiceWorkerMessageSource,
    exports: Exports,
    overrideOptions?: Omit<
      ThreadOptions<Imports, Exports>,
      'exports' | 'imports'
    >,
  ) {
    this.#createForClient(client, {...overrideOptions, exports});
  }

  import(
    client: ServiceWorkerMessageSource,
    overrideOptions?: Omit<ThreadOptions<Imports, Exports>, 'exports'>,
  ) {
    return this.#createForClient(client, overrideOptions).imports;
  }

  /** @deprecated Use `from()` instead. */
  create(
    client: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Imports, Exports>,
  ): Thread<Imports, Exports> {
    return this.#createForClient(client, overrideOptions);
  }

  #createForClient(
    source: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Imports, Exports>,
  ): Thread<Imports, Exports> {
    let thread = this.#threads.get(source);
    if (thread) return thread;

    thread = new Thread(
      {
        listen(listener, {signal}) {
          self.addEventListener(
            'message',
            (event) => {
              if (event.source !== source) return;
              listener(event.data);
            },
            {signal},
          );
        },
        send(message, transfer = []) {
          source.postMessage(message, transfer);
        },
      },
      {
        ...this.#options,
        ...overrideOptions,
      },
    );

    this.#threads.set(source, thread);

    return thread;
  }
}

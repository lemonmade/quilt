import {Thread, type ThreadOptions} from '../Thread.ts';

export type ServiceWorkerMessageSource = NonNullable<
  ExtendableMessageEvent['source']
>;

export interface ServiceWorkerClientThreads<
  Target = Record<string, never>,
  Self = Record<string, never>,
> {
  get(source: ServiceWorkerMessageSource): Thread<Target, Self> | undefined;
  delete(source: ServiceWorkerMessageSource): boolean;
  create(
    source: ServiceWorkerMessageSource,
    options?: ThreadOptions<Target, Self>,
  ): Thread<Target, Self>;
}

export class ThreadServiceWorkerClients<
  Target = Record<string, never>,
  Self = Record<string, never>,
> {
  #threads = new WeakMap<ServiceWorkerMessageSource, Thread<Target, Self>>();
  #listeners = new WeakMap<
    ServiceWorkerMessageSource,
    (value: unknown) => void
  >();
  #options: ThreadOptions<Target, Self> & {
    include?(source: ServiceWorkerMessageSource): boolean;
  };

  constructor(
    options: ThreadOptions<Target, Self> & {
      include?(source: ServiceWorkerMessageSource): boolean;
    } = {},
  ) {
    const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

    serviceWorker.addEventListener('message', (event) => {
      const source = event.source;

      if (source == null) return;
      if (options.include != null && !options.include(source)) return;

      this.createForClient(source);

      this.#listeners.get(source)?.(event.data);
    });

    this.#options = options;
  }

  get(client: ServiceWorkerMessageSource): Thread<Target, Self> | undefined {
    return this.#threads.get(client);
  }

  delete(client: ServiceWorkerMessageSource): boolean {
    return this.#threads.delete(client);
  }

  create(
    client: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Target, Self>,
  ): Thread<Target, Self> {
    return this.createForClient(client, overrideOptions);
  }

  private createForClient(
    source: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Target, Self>,
  ): Thread<Target, Self> {
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

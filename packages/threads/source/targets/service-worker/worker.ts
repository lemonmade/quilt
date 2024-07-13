import type {Thread} from '../../types.ts';
import {createThread, type ThreadOptions} from '../target.ts';

export type ServiceWorkerMessageSource = NonNullable<
  ExtendableMessageEvent['source']
>;

export interface ServiceWorkerClientThreads<
  Self = Record<string, never>,
  Target = Record<string, never>,
> {
  get(source: ServiceWorkerMessageSource): Thread<Target> | undefined;
  delete(source: ServiceWorkerMessageSource): boolean;
  create(
    source: ServiceWorkerMessageSource,
    options?: ThreadOptions<Self, Target>,
  ): Thread<Target>;
}

export function createThreadsFromServiceWorkerClients<
  Self = Record<string, never>,
  Target = Record<string, never>,
>({
  include,
  ...options
}: ThreadOptions<Self, Target> & {
  /**
   * Whether to automatically create a thread for a new client when a message
   * from it is received.
   *
   * @default () => true
   */
  include?(source: ServiceWorkerMessageSource): boolean;
} = {}): ServiceWorkerClientThreads<Self, Target> {
  const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

  const threads = new WeakMap<ServiceWorkerMessageSource, Thread<Target>>();
  const listeners = new WeakMap<
    ServiceWorkerMessageSource,
    (value: unknown) => void
  >();

  serviceWorker.addEventListener('message', (event) => {
    const source = event.source;

    if (source == null) return;
    if (include != null && !include(source)) return;

    createThreadForClient(source);

    listeners.get(source)?.(event.data);
  });

  return {
    get(client) {
      return threads.get(client);
    },
    delete(client) {
      return threads.delete(client);
    },
    create(client, options) {
      return createThreadForClient(client, options);
    },
  };

  function createThreadForClient(
    source: ServiceWorkerMessageSource,
    overrideOptions?: ThreadOptions<Self, Target>,
  ) {
    let thread = threads.get(source);
    if (thread) return thread;

    thread = createThread<Self, Target>(
      {
        listen(listener, options) {
          listeners.set(source, listener);

          options?.signal?.addEventListener('abort', () => {
            listeners.delete(source);
          });
        },
        send(message, transfer = []) {
          source.postMessage(message, transfer);
        },
      },
      {...options, ...overrideOptions},
    );

    threads.set(source, thread);

    return thread;
  }
}

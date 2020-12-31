import {
  memo,
  useRef,
  useMemo,
  useContext,
  useEffect,
  createContext,
} from 'react';
import type {ComponentType} from 'react';
import {retain, release, createWorkerFactory} from '@remote-ui/web-workers';
import {
  RemoteReceiver,
  RemoteRenderer,
  useWorker,
  createController,
} from '@remote-ui/react/host';

type MaybeDefaultExport<T> = T | {default: T};
// type ValueOrPropGetter<T, Props> = T | ((props: Props) => T);

type ComponentRecord = Record<string, ComponentType<any>>;

export const RemoteReceiverContext = createContext<RemoteReceiver | null>(null);
export const HostComponentContext = createContext<ComponentRecord>({});

export interface WorkerComponentOptions<
  _Props,
  ComponentConfig extends ComponentRecord = Record<string, never>
> {
  readonly displayName?: string;
  readonly receiver?: RemoteReceiver;
  readonly components?: ComponentConfig;
}

export function createWorkerComponent<
  Props,
  ComponentConfig extends ComponentRecord = Record<string, never>
>(
  workerComponent: () => Promise<MaybeDefaultExport<ComponentType<Props>>>,
  {
    displayName: explicitDisplayName,
    components: explicitComponents,
  }: WorkerComponentOptions<Props, ComponentConfig> = {},
): ComponentType<Props> {
  const displayName = `Worker(${explicitDisplayName ?? 'Component'})`;

  if (typeof workerComponent === 'function') {
    return createNoopComponent(displayName);
  }

  const createWorker = createWorkerFactory<{
    mount(
      props: Props,
      ...args: Parameters<typeof import('@remote-ui/core').createRemoteRoot>
    ): (props: Partial<Props>) => void;
  }>(workerComponent as string);

  const WorkerComponent = memo((props: Props) => {
    const worker = useWorker(createWorker);
    const mountedRef = useRef(true);
    const sentProps = useRef<Props | null>(null);
    const updaterRef = useRef<
      [((props: Partial<Props>) => void) | null, Partial<Props> | null]
    >([null, null]);

    const contextComponents = useContext(
      HostComponentContext,
    ) as ComponentConfig;
    const components = useMemo(
      () => ({...contextComponents, ...explicitComponents}),
      [contextComponents],
    );
    const componentsRef = useRef(components);
    componentsRef.current = components;

    const controller = useMemo(() => createController(components), [
      components,
    ]);

    const contextReceiver = useContext(RemoteReceiverContext);
    const receiverRef = useRef<RemoteReceiver>(null as any);

    receiverRef.current =
      contextReceiver ?? receiverRef.current ?? new RemoteReceiver();

    useEffect(() => {
      if (sentProps.current == null) {
        sentProps.current = {...props};

        (async () => {
          const update = await worker.mount(
            props,
            receiverRef.current.receive,
            {
              components: Object.keys(componentsRef.current) as any,
            },
          );
          // Might not need this, but definitely need to balance it out if we keep it
          retain(update);
          if (!mountedRef.current) return;

          const queuedUpdate = updaterRef.current[1];
          if (queuedUpdate) update(queuedUpdate);

          updaterRef.current = [update, null];
        })();
      } else {
        const oldKeys = Object.keys(sentProps.current);
        const currentKeys = new Set(Object.keys(props));
        const updates: {[key: string]: any} = {};

        for (const key of currentKeys) {
          const newValue = (props as any)[key];

          if (newValue !== (sentProps.current as any)[key]) {
            updates[key] = newValue;
          }
        }

        for (const key of oldKeys) {
          if (!currentKeys.has(key)) {
            updates[key] = undefined;
          }
        }

        const [update, queuedUpdate] = updaterRef.current;

        if (update) {
          update(updates as Partial<Props>);
        } else {
          updaterRef.current[1] = {...(queuedUpdate ?? {}), ...updates};
        }

        sentProps.current = {...props};
      }
    }, [worker, props]);

    useEffect(() => {
      return () => {
        mountedRef.current = false;
        const [update] = updaterRef.current;
        if (update) release(update);
      };
    }, []);

    if (receiverRef.current == null) {
      throw new Error('No receiver found');
    }

    return (
      <RemoteRenderer receiver={receiverRef.current} controller={controller} />
    );
  });

  WorkerComponent.displayName = displayName;

  return (WorkerComponent as unknown) as ComponentType<Props>;
}

function createNoopComponent<Props>(displayName: string): ComponentType<Props> {
  function WorkerComponent(_: Props) {
    return null;
  }

  WorkerComponent.displayName = displayName;

  return WorkerComponent;
}

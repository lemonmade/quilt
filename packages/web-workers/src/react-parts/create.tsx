import React, {memo, useRef, useContext, useEffect, ComponentType} from 'react';
import {retain, release} from 'remote-call';
import {
  Receiver,
  Controller,
  Renderer,
  ControllerContext,
  ReceiverContext,
} from '@remote-ui/react/host';

import {createWorkerFactory} from '../create';
import {useWorker} from './hooks';

type MaybeDefaultExport<T> = T | {default: T};
type ValueOrPropGetter<T, Props> = T | ((props: Props) => T);

export interface WorkerComponentOptions<
  Props,
  ComponentConfig extends {[key: string]: ComponentType<any>} = {}
> {
  readonly displayName?: string;
  readonly receiver?: Receiver;
  readonly controller?: ValueOrPropGetter<Controller<ComponentConfig>, Props>;
}

export function createWorkerComponent<
  Props extends object,
  ComponentConfig extends {[key: string]: ComponentType<any>} = {}
>(
  getComponent: () => Promise<MaybeDefaultExport<ComponentType<Props>>>,
  {
    displayName: explicitDisplayName,
    controller,
  }: WorkerComponentOptions<Props, ComponentConfig> = {},
): ComponentType<Props> {
  const displayName = `Worker(${explicitDisplayName ?? 'Component'})`;

  if (typeof getComponent === 'function') {
    return createNoopComponent(displayName);
  }

  const createWorker = createWorkerFactory<{
    mount(props: Props): (props: Partial<Props>) => void;
  }>(getComponent as string);

  const WorkerComponent = memo((props: Props) => {
    const worker = useWorker(createWorker);
    const mountedRef = useRef(true);
    const sentProps = useRef<Props | null>(null);
    const updaterRef = useRef<
      [((props: Partial<Props>) => void) | null, Partial<Props> | null]
    >([null, null]);

    const contextController = useContext(ControllerContext);
    const controllerRef = useRef<Controller<ComponentConfig> | null>(null);

    controllerRef.current =
      (typeof controller === 'function' ? controller(props) : controller) ??
      (contextController as any);

    const contextReceiver = useContext(ReceiverContext);
    const receiverRef = useRef<Receiver | null>(null);

    receiverRef.current =
      contextReceiver ?? receiverRef.current ?? new Receiver();

    useEffect(() => {
      if (sentProps.current == null) {
        sentProps.current = {...props};

        (async () => {
          const update = await worker.mount(props);
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

    if (controllerRef.current == null) {
      throw new Error('No controller found');
    }

    if (receiverRef.current == null) {
      throw new Error('No receiver found');
    }

    return (
      <Renderer
        receiver={receiverRef.current}
        controller={controllerRef.current}
      />
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

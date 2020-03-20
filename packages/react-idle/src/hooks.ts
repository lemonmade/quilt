import {useEffect, useRef} from 'react';

export type UnsupportedBehavior = 'immediate' | 'animationFrame';

interface RequestIdleCallbackOptions {
  timeout: number;
}

type RequestIdleCallbackHandle = any;

interface RequestIdleCallbackDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface RequestIdleCallbackApi {
  requestIdleCallback(
    callback: (deadline: RequestIdleCallbackDeadline) => void,
    options?: RequestIdleCallbackOptions,
  ): RequestIdleCallbackHandle;
  cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
}

interface Options {
  unsupportedBehavior?: UnsupportedBehavior;
}

export function useIdleCallback(
  callback: () => void,
  {unsupportedBehavior = 'animationFrame'}: Options = {},
) {
  const handle = useRef<RequestIdleCallbackHandle | null>(null);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      handle.current = ((window as any) as RequestIdleCallbackApi).requestIdleCallback(
        () => callback(),
      );
    } else if (unsupportedBehavior === 'animationFrame') {
      handle.current = window.requestAnimationFrame(() => {
        callback();
      });
    } else {
      callback();
    }

    return () => {
      const {current: currentHandle} = handle;
      handle.current = null;

      if (currentHandle == null) {
        return;
      }

      if ('cancelIdleCallback' in window) {
        ((window as any) as RequestIdleCallbackApi).cancelIdleCallback(
          currentHandle,
        );
      } else if (unsupportedBehavior === 'animationFrame') {
        window.cancelAnimationFrame(currentHandle);
      }
    };
  }, [callback, unsupportedBehavior]);
}

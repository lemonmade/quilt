import {useEffect} from 'react';

interface Props<
  Event extends keyof HTMLElementEventMap,
  Target extends EventTarget = Window
> {
  event: Event;
  passive?: boolean;
  capture?: boolean;
  target?: Target;
  handler: (this: Target, event: HTMLElementEventMap[Event]) => any;
}

export function EventListener<
  Event extends keyof HTMLElementEventMap,
  Target extends EventTarget = Window
>({event, handler, ...options}: Props<Event, Target>) {
  useEventListener(event, handler, options);
  return null;
}

interface Options<Target extends EventTarget = HTMLElement> {
  target?: Target;
  once?: boolean;
  passive?: boolean;
  capture?: boolean;
}

export function useEventListener<
  EventType extends keyof HTMLElementEventMap,
  Target extends EventTarget = HTMLElement
>(
  event: EventType,
  listener: (this: Target, event: HTMLElementEventMap[EventType]) => any,
  {target, once, passive, capture}: Options<Target> = {},
) {
  useEffect(() => {
    const finalTarget = target || window;
    const supportsOnce = supportsEventListenerOnceOption();
    const supportsPassive = supportsEventListenerPassiveOption();

    // Typing here sucks, but I can’t get EventListener | EventListener[Event]
    // to be respected by addEventListener :/
    const wrappedListener: any =
      once && !supportsOnce
        ? makeOnce(finalTarget, event, listener as any)
        : listener;

    if (supportsOnce || supportsPassive) {
      finalTarget.addEventListener(event, wrappedListener, {
        once,
        passive,
        capture,
      });

      return () => {
        finalTarget.removeEventListener(event, wrappedListener, {capture});
      };
    } else {
      finalTarget.addEventListener(event, wrappedListener, capture);

      return () => {
        finalTarget.removeEventListener(event, wrappedListener, capture);
      };
    }
  }, [event, listener, target, once, passive, capture]);
}

function makeOnce(
  target: EventTarget,
  eventName: string,
  listener: EventListener,
): EventListener {
  return function selfRemovingHandler(event: Event) {
    listener(event);
    target.removeEventListener(eventName, listener);
  };
}

let supportsPassive: boolean | null = null;

export function supportsEventListenerPassiveOption() {
  if (supportsPassive !== null) {
    return supportsPassive;
  }

  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() {
        supportsPassive = true;
      },
    });
    document.addEventListener('test', noop, opts);
  } catch (error) {
    supportsPassive = false;
  }

  document.removeEventListener('test', noop);
  return supportsPassive;
}

let supportsOnce: boolean | null = null;

export function supportsEventListenerOnceOption() {
  if (supportsOnce !== null) {
    return supportsOnce;
  }

  try {
    const opts = Object.defineProperty({}, 'once', {
      get() {
        supportsOnce = true;
      },
    });
    document.addEventListener('test', noop, opts);
  } catch (error) {
    supportsOnce = false;
  }

  document.removeEventListener('test', noop);
  return supportsOnce;
}

function noop() {}

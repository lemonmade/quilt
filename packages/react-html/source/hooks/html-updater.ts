import {useRef} from 'react';
import {updateOnClient} from '../utilities/update';
import {useDomClientEffect} from './dom-effect-client';

/**
 * Batches and applies updates to the HTML document. This hook uses
 * `requestAnimationFrame` to batch multiple updates into a single
 * set of DOM manipulations. As a result, updates to the HTML document
 * are *not* applied when `requestAnimationFrame` is not running (in most
 * browsers, this includes when your page is a background tab).
 */
export function useHtmlUpdater() {
  const queuedUpdate = useRef<number | null>(null);

  useDomClientEffect((manager) => {
    manager.hydrated();

    queuedUpdate.current = requestAnimationFrame(() => {
      updateOnClient(manager.state);
    });

    const clearUpdate = () => {
      if (queuedUpdate.current) {
        cancelAnimationFrame(queuedUpdate.current);
        queuedUpdate.current = null;
      }
    };

    const stopSubscription = manager.subscribe((state) => {
      clearUpdate();

      queuedUpdate.current = requestAnimationFrame(() => {
        queuedUpdate.current = null;
        updateOnClient(state);
      });
    });

    return () => {
      clearUpdate();
      stopSubscription();
    };
  });
}

import {useRef} from 'react';
import {updateOnClient} from '../utilities/update';
import {useDomClientEffect} from './dom-effect-client';

export function useHtmlUpdater() {
  const queuedUpdate = useRef<number | null>(null);

  useDomClientEffect((manager) => {
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

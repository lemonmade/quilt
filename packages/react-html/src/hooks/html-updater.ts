import {useRef} from 'react';
import {updateOnClient} from '../utilities/update';
import {useDomClientEffect} from './dom-effect-client';

export function useHtmlUpdater() {
  const queuedUpdate = useRef<number | null>(null);

  useDomClientEffect((manager) => {
    return manager.subscribe((state) => {
      if (queuedUpdate.current) {
        cancelAnimationFrame(queuedUpdate.current);
      }

      queuedUpdate.current = requestAnimationFrame(() => {
        updateOnClient(state);
      });
    });
  });
}

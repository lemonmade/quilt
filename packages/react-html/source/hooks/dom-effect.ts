import {useContext, useEffect, useRef} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {HTMLContext} from '../context.ts';
import {SERVER_ACTION_KIND, type HTMLManager} from '../manager.ts';

export function useDomEffect(
  perform: (manager: HTMLManager) =>
    | {
        update(...args: any[]): void;
        remove(): void;
      }
    | undefined,
  inputs: unknown[] = [],
) {
  const manager = useContext(HTMLContext);
  const resultRef = useRef<ReturnType<typeof perform>>();
  const effect = () => {
    if (resultRef.current) {
      resultRef.current.update(...inputs);
    } else {
      resultRef.current = perform(manager)!;
    }
  };

  useServerAction(effect, manager[SERVER_ACTION_KIND]);
  useEffect(effect, [manager, ...inputs]);
  useEffect(() => {
    return () => resultRef.current?.remove();
  }, []);
}

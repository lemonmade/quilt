/* eslint react-hooks/exhaustive-deps: off */

import {useContext, useEffect, useRef} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {HtmlContext} from '../context';
import {SERVER_ACTION_KIND} from '../manager';
import type {HtmlManager} from '../manager';

export function useDomEffect(
  perform: (
    manager: HtmlManager,
  ) => {update(...args: any[]): void; remove(): void},
  inputs: unknown[] = [],
) {
  const manager = useContext(HtmlContext);
  const resultRef = useRef<ReturnType<typeof perform>>();
  const effect = () => {
    if (resultRef.current) {
      resultRef.current.update(...inputs);
    } else {
      resultRef.current = perform(manager);
    }
  };

  useServerAction(effect, manager[SERVER_ACTION_KIND]);
  useEffect(effect, [manager, ...inputs]);
  useEffect(() => {
    return resultRef.current?.remove;
  }, []);
}

/* eslint react-hooks/exhaustive-deps: off */

import {useContext, useMemo} from 'react';
import {HtmlContext} from '../context';
import {useDomServerAction} from './dom-effect-server';

export function useSerialized<T>(
  id: string,
  serialize?: () => T | Promise<T>,
): T | undefined {
  const manager = useContext(HtmlContext);
  const data = useMemo(() => manager.getSerialization<T>(id), [id, manager]);

  useDomServerAction(
    (manager) => {
      if (serialize == null) return;

      const result = serialize();
      const handleResult = manager.setSerialization.bind(manager, id);
      return isPromise(result)
        ? result.then(handleResult)
        : handleResult(result);
    },
    {deferred: true},
  );

  return data;
}

function isPromise<T>(
  maybePromise: T | Promise<T>,
): maybePromise is Promise<T> {
  return maybePromise != null && 'then' in (maybePromise as any);
}

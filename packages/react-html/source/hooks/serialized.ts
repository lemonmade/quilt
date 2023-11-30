import {useContext, useMemo} from 'react';

import {HTMLContext} from '../context.ts';
import {type Serializable} from '../types.ts';

import {useDomServerAction} from './dom-effect-server.ts';

export function useSerialized<T>(
  id: string,
  serialize: () => T | Promise<T>,
): Serializable<T> | undefined;
export function useSerialized<T>(id: string, serialize: T): Serializable<T>;
export function useSerialized<T>(
  id: string,
  serialize?: T,
): Serializable<T> | undefined;
export function useSerialized<T>(
  id: string,
  serialize?: T | (() => T | Promise<T>),
) {
  const manager = useContext(HTMLContext);

  const data = useMemo(
    () =>
      typeof serialize === 'function' || serialize == null
        ? manager.getSerialization<T>(id)
        : serialize,
    [id, manager, serialize],
  );

  useDomServerAction(
    (manager) => {
      if (serialize == null) return;

      const result =
        typeof serialize === 'function' ? (serialize as () => T)() : serialize;
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
  return (
    maybePromise != null &&
    typeof maybePromise === 'object' &&
    'then' in (maybePromise as any)
  );
}

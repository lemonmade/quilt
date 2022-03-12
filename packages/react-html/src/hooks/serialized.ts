/* eslint react-hooks/exhaustive-deps: off */

import {useContext, useMemo} from 'react';
import {HtmlContext} from '../context';
import type {Serializable} from '../types';
import {useDomServerAction} from './dom-effect-server';

export function useSerialized<T extends Serializable>(
  id: string,
  serialize: T,
): T;
export function useSerialized<T extends Serializable>(
  id: string,
  serialize: () => T | Promise<T>,
): T | undefined;
export function useSerialized<T extends Serializable>(
  id: string,
  serialize?: T | (() => T | Promise<T>),
) {
  const manager = useContext(HtmlContext);
  console.log({serialized: true, id, manager});

  const data = useMemo(
    () =>
      typeof serialize === 'function' || serialize == null
        ? manager.getSerialization<T>(id)
        : serialize,
    [id, manager, serialize],
  );

  console.log({id, data});

  useDomServerAction(
    (manager) => {
      if (serialize == null) return;

      const result = typeof serialize === 'function' ? serialize() : serialize;
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

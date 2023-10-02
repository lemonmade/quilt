import {useMemo} from 'react';
import type {ReactNode} from 'react';

import {HTMLContext} from '../context.ts';
import {HTMLManager} from '../manager.ts';

interface Props {
  serializations?: {[key: string]: any} | Map<string, any>;
  hydrations?: {[key: string]: string} | Map<string, string>;
  children?: ReactNode;
}

export function TestHTML({children, serializations, hydrations}: Props) {
  const manager = useMemo(
    () =>
      new HTMLManager({
        hydrations: toMap(hydrations),
        serializations: toMap(serializations),
      }),
    [serializations, hydrations],
  );

  return (
    <HTMLContext.Provider value={manager}>{children}</HTMLContext.Provider>
  );
}

function toMap<Value>(store?: {[key: string]: Value} | Map<string, Value>) {
  if (store == null || store instanceof Map) return store;
  return new Map(Object.entries(store));
}

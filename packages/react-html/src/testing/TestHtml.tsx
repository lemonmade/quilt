import {useMemo} from 'react';
import type {ReactNode} from 'react';
import {HtmlContext} from '../context';
import {HtmlManager} from '../manager';

interface Props {
  serializations?: {[key: string]: any} | Map<string, any>;
  hydrations?: {[key: string]: string} | Map<string, string>;
  children?: ReactNode;
}

export function TestHtml({children, serializations, hydrations}: Props) {
  const manager = useMemo(
    () =>
      new HtmlManager({
        hydrations: toMap(hydrations),
        serializations: toMap(serializations),
      }),
    [serializations, hydrations],
  );

  return (
    <HtmlContext.Provider value={manager}>{children}</HtmlContext.Provider>
  );
}

function toMap<Value>(store?: {[key: string]: Value} | Map<string, Value>) {
  if (store == null || store instanceof Map) return store;
  return new Map(Object.entries(store));
}

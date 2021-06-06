import {useContext, useMemo} from 'react';
import type {PropsWithChildren} from 'react';
import {useSerialized} from '@quilted/react-html';

import {HeadersContext, HttpContext as HttpInternalContext} from '../context';
import type {ReadonlyHeaders} from '../types';

const SERIALIZED_ID = '_quilt.http';

export function HttpContext({
  children,
}: // eslint-disable-next-line @typescript-eslint/ban-types
PropsWithChildren<{}>) {
  const http = useContext(HttpInternalContext);

  const serializedHeaders = useSerialized(SERIALIZED_ID, () => {
    if (http == null || http.persistedHeaders.size === 0) return undefined;
    return [...http.persistedHeaders].reduce<{
      [key: string]: string | undefined;
    }>(
      (headers, header) => ({
        ...headers,
        [header]: http.headers.get(header),
      }),
      {},
    );
  });

  const headers = useMemo<ReadonlyHeaders>(() => {
    return http?.headers ?? {get: (header) => serializedHeaders?.[header]};
  }, [http?.headers, serializedHeaders]);

  return (
    <HeadersContext.Provider value={headers}>
      {children}
    </HeadersContext.Provider>
  );
}

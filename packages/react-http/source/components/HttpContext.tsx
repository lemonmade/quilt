import {ContextType, useContext, useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {useSerialized} from '@quilted/react-html';

import {HttpHeadersContext, HttpServerContext} from '../context';

const SERIALIZED_ID = '_quilt.http';

/**
 * Provides HTTP details to your React application. This component will
 * makes headers available on the server-side, and takes care of serializing
 * any headers used for reference on the client.
 */
export function HttpContext({children}: PropsWithChildren<{}>) {
  const http = useContext(HttpServerContext);

  const serializedHeaders = useSerialized(SERIALIZED_ID, () => {
    if (http == null || http.persistedHeaders.size === 0) return undefined;

    const serializedHeaders: Record<string, string> = {};

    for (const header of http.persistedHeaders) {
      const value = http.headers.get(header);
      if (value) serializedHeaders[header] = value;
    }

    return serializedHeaders;
  });

  const context = useMemo<ContextType<typeof HttpHeadersContext>>(
    () => http?.headers ?? new Headers(serializedHeaders),
    [http, serializedHeaders],
  );

  return (
    <HttpHeadersContext.Provider value={context}>
      {children}
    </HttpHeadersContext.Provider>
  );
}

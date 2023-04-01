import {useContext} from 'react';
import {HttpHeadersContext} from '../context.ts';
import {useHttpAction} from './http-action.ts';

/**
 * Returns the request header with the provided name, if server
 * headers were provided through context, and if the header exists.
 * Header names are normalized, so any capitalization will work.
 * If the header is not found, this hook returns `undefined`.
 *
 * Typically, request headers are only available during server-side
 * rendering. When you use this hook, the requested header is added
 * to a list of headers that are “persisted” for the client to read
 * by embedding them into the HTML payload. Make sure you are OK
 * with the header being embedded in the HTML payload, as these headers
 * could have come from your own internal routing logic and may contain
 * sensitive data. Note that, for this feature to work, you must also
 * be using `@quilted/react-html`’s server-side rendering feature.
 */
export function useRequestHeader(header: string) {
  const headers = useContext(HttpHeadersContext);

  useHttpAction((http) => http.persistHeader(header));

  if (headers == null) {
    throw new Error('No HTTP headers context found');
  }

  return headers.get(header);
}

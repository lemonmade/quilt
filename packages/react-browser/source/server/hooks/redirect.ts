import type {StatusCode} from '@quilted/http';
import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Registers an HTTP redirect during server-side rendering. This will
 * set the status code and bail out of server-rendering. You can optionally
 * pass a status code as the second argument, which will override the
 * default of using a [`302` status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302).
 */
export function useResponseRedirect(to: string, statusCode?: StatusCode) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    const headers = new Headers(response.headers);
    headers.append('Location', new URL(to, response.initialURL).href);

    throw new Response(null, {
      status: statusCode ?? 302,
      headers,
    });
  });
}

import type {StatusCode} from '@quilted/http';
import {useHttpAction} from './http-action.ts';

/**
 * Registers an HTTP redirect during server-side rendering. This will
 * set the status code and bail out of server-rendering. You can optionally
 * pass a status code as the second argument, which will override the
 * default of using a [`302` status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302).
 */
export function useResponseRedirect(to: string, statusCode?: StatusCode) {
  useHttpAction((http) => http.redirectTo(to, statusCode));
}

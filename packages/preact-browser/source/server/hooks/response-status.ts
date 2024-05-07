import type {StatusCode} from '@quilted/http';
import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Sets the HTTP response status code for this request. If multiple calls
 * are made to this hook, the highest status code will be used.
 *
 * This hook only works during server-side rendering.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export function useResponseStatus(statusCode: StatusCode) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.status.set(statusCode);
  });
}

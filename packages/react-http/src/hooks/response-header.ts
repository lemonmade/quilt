import {useHttpAction} from './http-action';

/**
 * Appends a response header to the provided value. Only works during
 * server-side rendering.
 */
export function useResponseHeader(header: string, value: string) {
  useHttpAction((http) => http.responseHeaders.append(header, value));
}

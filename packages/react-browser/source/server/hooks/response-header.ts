import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Appends a response header to the provided value. Only works during
 * server-side rendering.
 */
export function useResponseHeader(header: string, value: string) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.headers.append(header, value);
  });
}

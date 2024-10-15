import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Sets a serialization for the HTML response. This value can then be read on the client
 * using the `useSerialized()` hook.
 */
export function useResponseSerialization(name: string, content: unknown) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.serializations.set(name, content);
  });
}

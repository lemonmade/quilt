import {BrowserResponse} from '@quilted/browser/server';

import {useBrowserDetails} from '../../context.ts';

/**
 * Returns the mutable browser response object. This hook can only be called on the
 * server, and only when a `BrowserResponse` is found in the context. This object gives
 * you access to details about the original request, and the ability to read and write
 * headers and head tags to the eventual response.
 *
 * When using the `renderToHTMLResponse()` or `renderToHTMLString()` functions, this context
 * is automatically provided for you. If you are using Preact’s server rendering functions
 * directly, you will need to provide a `BrowserResponse` object yourself.
 */
export function useBrowserResponse() {
  const response = useBrowserDetails();

  if (typeof document === 'object') {
    throw new Error(
      `You can only call the useBrowserResponse() hook in server-side code.`,
    );
  }

  if (!(response instanceof BrowserResponse)) {
    throw new Error(`No BrowserResponse found in context.`);
  }

  return response;
}

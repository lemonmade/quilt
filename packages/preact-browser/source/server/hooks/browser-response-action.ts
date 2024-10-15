import {BrowserResponse} from '@quilted/browser/server';

import {useBrowserDetails} from '../../context.ts';

/**
 * During server-side rendering, the function you pass to this hook is
 * called with the mutable browser response object, if one is found.
 * You typically shouldn’t need to call this hook directly, as all
 * of the individual actions you can perform on the HTTP manager are
 * exposed as dedicated hooks.
 */
export function useBrowserResponseAction(
  perform: (response: BrowserResponse) => void,
) {
  if (typeof document === 'object') return;
  const response = useBrowserDetails();
  if (response && response instanceof BrowserResponse) perform(response);
}

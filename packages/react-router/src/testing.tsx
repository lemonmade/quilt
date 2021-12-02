import {resolveUrl} from '@quilted/routing';

import {Routing} from './components';
import type {Router, Options} from './router';
import {enhanceUrl, createKey} from './utilities';

export {Routing};
export type {Router};

export function createTestRouter(
  url: URL | string = '/',
  {prefix, state = {}, isExternal: explicitIsExternal}: Options = {},
): Router {
  const currentUrl = enhanceUrl(
    typeof url === 'string' ? new URL(url, window.location.href) : url,
    state,
    createKey(),
    prefix,
  );

  const isExternal =
    explicitIsExternal ?? ((url) => url.origin === currentUrl.origin);

  return {
    currentUrl,
    prefix,
    /* eslint-disable @typescript-eslint/no-empty-function */
    go() {},
    back() {},
    forward() {},
    block() {
      return () => {};
    },
    listen() {
      return () => {};
    },
    navigate() {},
    /* eslint-enable @typescript-eslint/no-empty-function */
    resolve: (to) => {
      const url = resolveUrl(to, currentUrl);
      return {url, external: isExternal(url, currentUrl)};
    },
  };
}

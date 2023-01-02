import {useMemo} from 'react';
import type {ReactNode} from 'react';
import {resolveUrl} from '@quilted/routing';

import type {Router, Options} from './router';
import {CurrentUrlContext, RouterContext} from './context';
import {enhanceUrl, createKey} from './utilities';
import {FocusContext} from './components';

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
    explicitIsExternal ?? ((url) => url.origin !== currentUrl.origin);

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

interface Props {
  router?: Router;
  children: ReactNode;
}

export function TestRouting({children, router: initialRouter}: Props) {
  const router = useMemo(
    () => initialRouter ?? createTestRouter(),
    [initialRouter],
  );

  return (
    <RouterContext.Provider value={router}>
      <CurrentUrlContext.Provider value={router.currentUrl}>
        <FocusContext>{children}</FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
}

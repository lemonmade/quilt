import {useMemo} from 'react';
import type {ReactNode} from 'react';
import {resolveUrl, type Prefix, type NavigateTo} from '@quilted/routing';

import type {Router, Options} from './router.ts';
import {CurrentUrlContext, RouterContext} from './context.ts';
import {enhanceUrl, createKey} from './utilities.ts';
import {FocusContext} from './components.ts';
import type {EnhancedURL} from './types.ts';

export class TestRouter implements Router {
  readonly prefix?: Prefix;
  readonly currentUrl: EnhancedURL;
  readonly #isExternal: (url: URL, currentUrl: URL) => boolean;

  constructor(
    url: URL | string = '/',
    {prefix, state = {}, isExternal: explicitIsExternal}: Options = {},
  ) {
    this.currentUrl = enhanceUrl(
      typeof url === 'string' ? new URL(url, window.location.href) : url,
      state,
      createKey(),
      prefix,
    );
    this.prefix = prefix;
    this.#isExternal =
      explicitIsExternal ?? ((url) => url.origin !== this.currentUrl.origin);
  }

  go() {}

  back() {}

  forward() {}

  block() {
    return () => {};
  }

  listen() {
    return () => {};
  }

  navigate() {}

  resolve(to: NavigateTo) {
    const url = resolveUrl(to, this.currentUrl);
    return {url, external: this.#isExternal(url, this.currentUrl)};
  }
}

export interface TestRoutingProps {
  router?: Router;
  children: ReactNode;
}

export function TestRouting({
  children,
  router: initialRouter,
}: TestRoutingProps) {
  const router = useMemo(
    () => initialRouter ?? new TestRouter(),
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

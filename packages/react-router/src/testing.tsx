import React, {useMemo, ReactNode} from 'react';

import type {Router, Options} from './router';
import {CurrentUrlContext, RouterContext} from './context';
import {enhanceUrl, createKey} from './utilities';
import {FocusContext} from './components';

export function createTestRouter(
  url: URL | string = '/',
  {prefix, state = {}}: Options = {},
): Router {
  return {
    currentUrl: enhanceUrl(
      typeof url === 'string' ? new URL(url, window.location.href) : url,
      state,
      createKey(),
      prefix,
    ),
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
  };
}

interface Props {
  router?: Router;
  children: ReactNode;
}

export function TestRouter({children, router: initialRouter}: Props) {
  const router = useMemo(() => initialRouter ?? createTestRouter(), [
    initialRouter,
  ]);

  return (
    <RouterContext.Provider value={router}>
      <CurrentUrlContext.Provider value={router.currentUrl}>
        <FocusContext>{children}</FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
}

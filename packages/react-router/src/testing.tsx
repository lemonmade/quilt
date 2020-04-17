import React, {useRef, ReactNode} from 'react';

import {Router, NavigateTo, NavigateOptions, Options} from './router';
import {CurrentUrlContext, RouterContext} from './context';

class TestRouterControl extends Router {
  navigate(_to: NavigateTo, _options?: NavigateOptions) {}
  go(_count: number) {}
}

export function createTestRouter(
  url: URL = new URL('/', window.location.href),
  options?: Options,
) {
  return new TestRouterControl(url, options);
}

interface Props {
  router?: Router;
  children: ReactNode;
}

export function TestRouter({children, router: initialRouter}: Props) {
  const router = useRef(initialRouter || createTestRouter());

  return (
    <RouterContext.Provider value={router.current}>
      <CurrentUrlContext.Provider value={router.current.currentUrl}>
        {children}
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
}

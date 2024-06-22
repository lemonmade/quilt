import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';

export interface NavigationProps {
  router?: Router;
}

export function Navigation({
  router,
  children,
}: RenderableProps<NavigationProps>) {
  const browser = useBrowserDetails({optional: true});
  const resolvedRouter = useMemo(
    () => router ?? new Router(browser?.request.url),
    [router],
  );

  return (
    <RouterContext.Provider value={resolvedRouter}>
      {children}
    </RouterContext.Provider>
  );
}

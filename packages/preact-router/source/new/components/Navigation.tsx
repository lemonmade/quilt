import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';

export interface NavigationProps {
  router?: Router;
}

export function Navigation({
  router,
  children,
}: RenderableProps<NavigationProps>) {
  const resolvedRouter = useMemo(() => router ?? new Router(), [router]);

  return (
    <RouterContext.Provider value={resolvedRouter}>
      {children}
    </RouterContext.Provider>
  );
}

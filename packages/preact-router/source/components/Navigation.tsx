import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';
import type {RouteDefinition} from '../types.ts';

import {Routes} from './Routes.tsx';

export interface NavigationProps {
  router?: Router;
  routes?: readonly RouteDefinition<any, any>[];
}

export function Navigation({
  router,
  routes,
  children,
}: RenderableProps<NavigationProps>) {
  const browser = useBrowserDetails({optional: true});
  const resolvedRouter = useMemo(
    () => router ?? new Router(browser?.request.url),
    [router],
  );

  const content = routes ? <Routes list={routes} /> : children;

  return (
    <RouterContext.Provider value={resolvedRouter}>
      {content}
    </RouterContext.Provider>
  );
}

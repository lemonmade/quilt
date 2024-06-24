import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';
import type {RouteDefinition} from '../types.ts';

import {Routes} from './Routes.tsx';

export interface NavigationProps<Context = unknown> {
  router?: Router;
  routes?: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
}

export function Navigation<Context = unknown>({
  router,
  routes,
  context,
  children,
}: RenderableProps<NavigationProps<Context>>) {
  const browser = useBrowserDetails({optional: true});
  const resolvedRouter = useMemo(
    () => router ?? new Router(browser?.request.url),
    [router],
  );

  const content = routes ? (
    <Routes list={routes} context={context} />
  ) : (
    children
  );

  return (
    <RouterContext.Provider value={resolvedRouter}>
      {content}
    </RouterContext.Provider>
  );
}

import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';
import {useAsyncActionCacheSerialization} from '@quilted/preact-async';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';
import type {RouteDefinition} from '../types.ts';

import {Routes} from './Routes.tsx';

export interface NavigationProps<Context = unknown> {
  router?: Router;
  routes?: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
  serialize?: boolean;
}

export function Navigation<Context = unknown>({
  router: explicitRouter,
  routes,
  context,
  children,
  serialize = true,
}: RenderableProps<NavigationProps<Context>>) {
  const browser = useBrowserDetails({optional: true});
  const router = useMemo(
    () => explicitRouter ?? new Router(browser?.request.url),
    [explicitRouter],
  );

  if (router.cache && serialize) {
    useAsyncActionCacheSerialization(router.cache, {name: 'router'});
  }

  const content = routes ? (
    <Routes list={routes} context={context} />
  ) : (
    children
  );

  return (
    <RouterContext.Provider value={router}>{content}</RouterContext.Provider>
  );
}

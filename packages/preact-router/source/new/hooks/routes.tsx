import type {ComponentChild} from 'preact';
import {useMemo} from 'preact/hooks';
import {computed} from '@quilted/signals';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import {RouterContext} from '../context.ts';
import {testMatch} from '../routing.ts';
import {AsyncAction} from '@quilted/async';

export function useRoutes(routes: readonly RouteDefinition[]) {
  const router = RouterContext.use();

  const routeNavigationEntry = useMemo(() => {
    const routeEntryMap = new WeakMap<
      RouteDefinition,
      RouteNavigationEntry<any, any>
    >();

    return computed(() => {
      const currentRequest = router.currentRequest;
      const currentURL = currentRequest.url;

      const processRoutes = (
        routes: readonly RouteDefinition[],
        parent?: RouteNavigationEntry<any, any>,
      ) => {
        for (const route of routes) {
          let match: ReturnType<typeof testMatch>;

          if (Array.isArray(route.match)) {
            for (const routeMatch of route.match) {
              match = testMatch(
                currentURL,
                routeMatch,
                parent?.consumed,
                route.exact,
              );
              if (match != null) break;
            }
          } else {
            match = testMatch(
              currentURL,
              route.match,
              parent?.consumed,
              route.exact,
            );
          }

          if (match == null) continue;

          const entry: RouteNavigationEntry<any, any> = {
            request: currentRequest,
            key: '',
            route,
            parent,
            matched: match.matched,
            consumed: match.consumed,
            load: route.load
              ? new AsyncAction(() => route.load!(entry as any))
              : undefined,
          } as any;

          if (parent == null) {
            routeEntryMap.set(route, entry);
          }

          if (route.children) {
            processRoutes(route.children, entry);
          }

          return entry;
        }
      };

      return processRoutes(routes);
    });
  }, [router]);

  const entry = routeNavigationEntry.value;

  return entry ? <RouteNavigationRenderer entry={entry} /> : null;
}

function RouteNavigationRenderer<Data = unknown, Input = unknown>({
  entry,
}: {
  entry: RouteNavigationEntry<Data, Input>;
}) {
  const {route} = entry;

  let content: ComponentChild = null;

  if (typeof route.render === 'function') {
    content = route.render(entry as any);
  } else {
    content = route.render;
  }

  // const renderedChildren = route.

  // TODO: wrap with context pointing to the entry
  return <>{content}</>;
}

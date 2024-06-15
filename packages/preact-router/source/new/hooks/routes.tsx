import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useMemo} from 'preact/hooks';
import {computed} from '@quilted/signals';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import {RouterContext, RouteNavigationEntryContext} from '../context.ts';
import {testMatch} from '../routing.ts';
import {AsyncAction} from '@quilted/async';

export function useRoutes(routes: readonly RouteDefinition[]) {
  const router = RouterContext.use();
  const parent = RouteNavigationEntryContext.use({optional: true});

  const routeStack = useMemo(() => {
    const routeEntryMap = new WeakMap<
      RouteDefinition,
      RouteNavigationEntry<any, any>
    >();

    return computed(() => {
      const currentRequest = router.currentRequest;
      const currentURL = currentRequest.url;

      const routeStack: RouteNavigationEntry<any, any>[] = [];

      const processRoutes = (
        routes: readonly RouteDefinition[],
        parent?: RouteNavigationEntry<any, any>,
      ) => {
        for (const route of routes) {
          let match: ReturnType<typeof testMatch>;
          const exact = route.exact ?? route.children == null;

          if (Array.isArray(route.match)) {
            for (const routeMatch of route.match) {
              match = testMatch(
                currentURL,
                routeMatch,
                parent?.consumed,
                exact,
              );
              if (match != null) break;
            }
          } else {
            match = testMatch(currentURL, route.match, parent?.consumed, exact);
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

          routeStack.push(entry);

          return entry;
        }
      };

      processRoutes(routes, parent);

      return routeStack;
    });
  }, [router, parent]);

  const entries = routeStack.value;

  let content: VNode<any> | null = null;

  for (const entry of entries) {
    content = (
      <RouteNavigationRenderer entry={entry}>{content}</RouteNavigationRenderer>
    );
  }

  return content;
}

function RouteNavigationRenderer<Data = unknown, Input = unknown>({
  entry,
  children,
}: RenderableProps<{
  entry: RouteNavigationEntry<Data, Input>;
}>) {
  const {route} = entry;

  let content: ComponentChild = null;

  if (typeof route.render === 'function') {
    content = route.render({...entry, children} as any);
  } else {
    if ('render' in route) {
      content = route.render;
    }

    if (content == null) {
      content = children ?? null;
    } else if (isValidElement(content) && children != null) {
      content = cloneElement(content, null, children);
    }
  }

  return (
    <RouteNavigationEntryContext.Provider value={entry}>
      {content}
    </RouteNavigationEntryContext.Provider>
  );
}

import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useEffect, useMemo} from 'preact/hooks';
import {computed, effect} from '@quilted/signals';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import {RouterContext, RouteNavigationEntryContext} from '../context.ts';
import {testMatch} from '../routing.ts';
import {AsyncAction, AsyncActionCache} from '@quilted/async';

class RouteNavigationCache {
  #cache = new AsyncActionCache();

  get<Data = unknown, Input = unknown>(
    entry: Omit<RouteNavigationEntry<Data, Input>, 'load'>,
  ): RouteNavigationEntry<Data, Input> {
    const load = this.#cache.create(
      (cached) =>
        new AsyncAction<Data, Input>(
          (input) => {
            return entry.route.load!(input, entry as any);
          },
          {cached},
        ),
      {key: entry.key},
    );

    Object.assign(entry, {load});

    return entry as any;
  }
}

export function useRoutes(routes: readonly RouteDefinition<any, any>[]) {
  const router = RouterContext.use();
  const parent = RouteNavigationEntryContext.use({optional: true});

  const routeStack = useMemo(() => {
    const cache = new RouteNavigationCache();

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
            route,
            parent,
            matched: match.matched,
            consumed: match.consumed,
          } as any;

          let key: unknown;

          if (route.key) {
            key =
              typeof route.key === 'function'
                ? route.key(entry as any)
                : route.key;
          } else {
            key = match.consumed
              ? // Need an extra postfix `/` to differentiate an index route from its parent
                `${match.consumed}${match.matched === '' ? '/' : ''}`
              : `${parent?.consumed ?? ''}/${stringifyRoute(route)}`;
          }

          Object.assign(entry, {key});

          const resolved = route.load ? cache.get(entry) : entry;

          if (route.children) {
            processRoutes(route.children, resolved);
          }

          routeStack.push(resolved);

          return resolved;
        }
      };

      processRoutes(routes, parent);

      return routeStack;
    });
  }, [router, parent]);

  useEffect(() => {
    return effect(() => {
      const entries = routeStack.value;

      for (const entry of entries) {
        entry.load?.run(entry.route.input?.(entry as any));
      }
    });
  }, [routeStack]);

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

function stringifyRoute({match}: RouteDefinition) {
  if (match == null || match === true || match === '*') {
    return '*';
  }

  if (typeof match === 'string') {
    return match[0] === '/' ? match.slice(1) : match;
  }

  if (match instanceof RegExp) {
    return match.toString();
  }
}

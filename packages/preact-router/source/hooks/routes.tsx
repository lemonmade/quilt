import {Suspense} from 'preact/compat';
import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useEffect, useMemo} from 'preact/hooks';
import {AsyncAction, AsyncActionCache} from '@quilted/async';
import {computed, effect, ReadonlySignal} from '@quilted/signals';
import {testMatch} from '@quilted/routing';

import type {
  NavigationRequest,
  RouteDefinition,
  RouteNavigationEntry,
} from '../types.ts';
import {RouterContext, RouteNavigationEntryContext} from '../context.ts';

import {Router} from '../Router.ts';

class RouteNavigationCache {
  #router: Router;
  #entryCache = new Map<string, RouteNavigationEntry<any, any, any>>();
  #loadCache = new AsyncActionCache();
  #matchCache = new Map<
    string,
    readonly RouteNavigationEntry<any, any, any>[]
  >();

  constructor(router: Router) {
    this.#router = router;
  }

  match<Context = any>(
    request: NavigationRequest,
    routes: readonly NoInfer<RouteDefinition<any, any, Context>>[],
    {
      parent,
      context = parent?.context as any,
    }: {
      context?: Context;
      parent?: NoInfer<RouteNavigationEntry<any, any, any>>;
    } = {},
  ) {
    // TODO: handle multiple sibling `useRoutes()`
    let matchID = request.id;
    if (parent) matchID += `@${stringifyKey(parent.key)}`;

    let routeStack = this.#matchCache.get(matchID) as
      | RouteNavigationEntry<any, any, any>[]
      | undefined;
    if (routeStack) {
      return routeStack;
    }

    routeStack = [];
    this.#matchCache.set(matchID, routeStack);

    const router = this.#router;
    const currentURL = request.url;
    const entryCache = this.#entryCache;
    const loadCache = this.#loadCache;

    const processRoutes = (
      routes: readonly RouteDefinition<any, any, Context>[],
      parent?: RouteNavigationEntry<any, any, Context>,
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
              router.base,
            );
            if (match != null) break;
          }
        } else {
          match = testMatch(
            currentURL,
            route.match,
            parent?.consumed,
            exact,
            router.base,
          );
        }

        if (match == null) continue;

        let key: unknown;

        if (route.key) {
          key =
            typeof route.key === 'function'
              ? route.key({
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  input: {},
                  data: {},
                } as any)
              : route.key;
        } else {
          const getMatched =
            typeof match.matched === 'string'
              ? match.matched
              : match.matched[0];

          key = match.consumed
            ? // Need an extra postfix `/` to differentiate an index route from its parent
              `${match.consumed}${getMatched === '' || getMatched === '/' ? '/' : ''}`
            : `${parent?.consumed ?? ''}/${stringifyRoute(route)}`;
        }

        console.log({key, routes});

        const id = `${matchID}:${typeof key === 'string' ? key : JSON.stringify(key)}`;

        let entry = entryCache.get(id);
        if (entry == null) {
          const load = route.load
            ? loadCache.create(
                (cached) =>
                  new AsyncAction(() => route.load!(entry as any, context), {
                    cached,
                  }),
                {key: id},
              )
            : undefined;

          entry = (
            load
              ? {
                  id,
                  key,
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  load,
                  get input() {
                    return load.latest.input;
                  },
                  get data() {
                    return load.data;
                  },
                }
              : {
                  id,
                  key,
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  load,
                  input: {},
                  data: {},
                }
          ) as any;

          entryCache.set(id, entry!);
        }

        routeStack.push(entry!);

        if (route.children) {
          processRoutes(route.children, entry);
        }

        return entry!;
      }
    };

    processRoutes(routes, parent);

    return routeStack;
  }
}

function stringifyKey(key: unknown) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

export function useRoutes<Context = unknown>(
  routes: readonly RouteDefinition<any, any, Context>[],
  {context}: {context?: Context} = {},
) {
  const router = RouterContext.use();
  const parent = RouteNavigationEntryContext.use({optional: true});

  const routeStack = useMemo(() => {
    const cache = new RouteNavigationCache(router);

    return computed(() => {
      const matched = cache.match(router.currentRequest, routes, {
        parent,
        context,
      });
      console.log({parent, matched});
      return matched;
    });
  }, [router, parent]);

  return (
    <Suspense fallback={null}>
      <RouteStackRenderer stack={routeStack} />
    </Suspense>
  );
}

function RouteStackRenderer({
  stack,
}: {
  stack: ReadonlySignal<RouteNavigationEntry<any, any>[]>;
}) {
  const entries = stack.value;

  let promises: Promise<any>[] | undefined;

  for (const entry of entries) {
    if (entry.load != null && !entry.load.hasFinished) {
      promises ??= [];
      const promise = entry.load.run(entry.route.input?.(entry as any));
      promises.push(promise);
    }
  }

  if (promises != null) {
    throw Promise.race(promises);
  }

  let content: VNode<any> | null = null;

  for (const entry of [...entries].reverse()) {
    content = (
      <RouteNavigationRenderer entry={entry}>{content}</RouteNavigationRenderer>
    );
  }

  useEffect(() => {
    let firstRun = true;

    return effect(() => {
      const entries = stack.value;

      if (firstRun) {
        firstRun = false;
        return;
      }

      for (const entry of entries) {
        entry.load?.run(entry.route.input?.(entry as any));
      }
    });
  }, [stack]);

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
    content = route.render(children, entry as any);
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

function stringifyRoute({match}: RouteDefinition<any, any, any>) {
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

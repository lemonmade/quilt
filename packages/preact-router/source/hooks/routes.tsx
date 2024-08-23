import {Suspense} from 'preact/compat';
import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useEffect, useMemo} from 'preact/hooks';
import {computed, effect, ReadonlySignal} from '@quilted/signals';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import {RouterContext, RouteNavigationEntryContext} from '../context.ts';
import {RouterNavigationCache, type Router} from '../Router.ts';

export function useRoutes<Context = unknown>(
  routes: readonly RouteDefinition<any, any, Context>[],
  {context}: {context?: Context} = {},
) {
  const router = RouterContext.use();
  const parent = RouteNavigationEntryContext.use({optional: true});

  const routeStack = useMemo(() => {
    const cache = router.cache ?? new RouterNavigationCache(router);

    return computed(() => {
      const matched = cache.match(router.currentRequest, routes, {
        parent,
        context,
      });

      return matched;
    });
  }, [router, parent]);

  return (
    <Suspense fallback={null}>
      <RouteStackRenderer router={router} stack={routeStack} />
    </Suspense>
  );
}

function RouteStackRenderer({
  router,
  stack,
}: {
  router: Router;
  stack: ReadonlySignal<RouteNavigationEntry<any, any>[]>;
}) {
  const entries = stack.value;

  let promises: Promise<any>[] | undefined;

  for (const entry of entries) {
    if (entry.load != null && !entry.load.hasFinished) {
      promises ??= [];
      const promise = entry.load.run(entry.input);
      promises.push(promise);
    }
  }

  if (promises != null) {
    throw Promise.race(promises);
  }

  let content: VNode<any> | null = null;

  for (const entry of [...entries].reverse()) {
    content = (
      <RouteNavigationRenderer router={router} entry={entry}>
        {content}
      </RouteNavigationRenderer>
    );
  }

  return content;
}

function RouteNavigationRenderer<Data = unknown, Input = unknown>({
  router,
  entry,
  children,
}: RenderableProps<{
  router: Router;
  entry: RouteNavigationEntry<Data, Input>;
}>) {
  useEffect(() => {
    if (entry.load == null) return;

    let firstRun = true;

    return effect(() => {
      const load = entry.load;

      if (firstRun) {
        firstRun = false;
        return;
      }

      load?.run(entry.input);
    });
  }, [entry]);

  const {route} = entry;

  if (route.redirect != null) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: router.resolve(route.redirect).url.href,
      },
    });
  }

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

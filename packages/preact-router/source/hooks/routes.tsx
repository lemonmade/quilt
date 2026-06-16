import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useContext, useEffect, useMemo} from 'preact/hooks';
import {Suspense} from 'preact/compat';
import {
  computed,
  effect,
  untracked,
  isSignal,
  type ReadonlySignal,
} from '@quilted/signals';
import {
  QuiltFrameworkContextPreact,
  useQuiltContext,
} from '@quilted/preact-context';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import type {Navigation} from '../Navigation.ts';

export function useRoutes<Context = unknown>(
  routes:
    | readonly RouteDefinition<any, any, Context>[]
    | ReadonlySignal<readonly RouteDefinition<any, any, Context>[]>,
  {context}: {context?: Context} = {},
) {
  const navigation = useQuiltContext('navigation');
  const parentEntry = useQuiltContext('navigationEntry', {optional: true});

  const routeStack = useMemo(() => {
    const cache = navigation.cache;

    return computed(() => {
      // Resolving the list inside the `computed` (rather than capturing it in
      // the `useMemo` deps) lets a *signal* of routes re-match in the same tick
      // the URL changes. A route tree that is swapped based on the current URL
      // (e.g. a cross-scope navigation that activates a different set of
      // routes) is otherwise a prop gated on the parent's render, so it lags
      // the `currentRequest` signal the matcher reads directly — for one render
      // the matcher sees the new URL against the old tree. Passing the list as
      // a signal derived from the URL keeps both updates in one glitch-free
      // graph, so the matcher never sees a mismatched URL/tree pair.
      const list = isSignal(routes) ? routes.value : routes;

      const matched = cache.match(navigation.currentRequest, list, {
        parent: parentEntry,
        context,
      });

      return matched;
    });
    // Include `routes`/`context` so a route tree swapped in place as a plain
    // array (new identity each render) still re-matches against the new tree.
    // When `routes` is a signal its identity is stable and the `computed` above
    // tracks its value reactively instead.
  }, [navigation, parentEntry, routes, context]);

  return (
    <Suspense fallback={null}>
      <RouteStackRenderer navigation={navigation} stack={routeStack} />
    </Suspense>
  );
}

function RouteStackRenderer({
  navigation,
  stack,
}: {
  navigation: Navigation;
  stack: ReadonlySignal<RouteNavigationEntry<any, any>[]>;
}) {
  const entries = stack.value;

  // Eagerly kick off all loads in parallel before any rendering happens.
  untracked(() => {
    for (const entry of entries) {
      if (entry.load != null && !entry.load.hasFinished) {
        entry.load.run(entry.input);
      }
    }
  });

  let content: VNode<any> | null = null;

  for (const entry of [...entries].reverse()) {
    content = (
      <RouteNavigationRenderer
        key={
          typeof entry.key === 'string' ? entry.key : JSON.stringify(entry.key)
        }
        navigation={navigation}
        entry={entry}
      >
        {content}
      </RouteNavigationRenderer>
    );
  }

  return content;
}

function RouteNavigationRenderer<Data = unknown, Input = unknown>({
  navigation,
  entry,
  children,
}: RenderableProps<{
  navigation: Navigation;
  entry: RouteNavigationEntry<Data, Input>;
}>) {
  untracked(() => {
    if (entry.load != null && !entry.load.hasFinished) {
      throw entry.load.run(entry.input);
    }
  });

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
        Location: navigation.resolve(route.redirect).url.href,
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

  const existingContext = useContext(QuiltFrameworkContextPreact);
  const newQuiltContext = useMemo(
    () => ({
      ...existingContext,
      navigationEntry: entry as RouteNavigationEntry<any, any>,
    }),
    [existingContext, entry],
  );

  return (
    <QuiltFrameworkContextPreact.Provider value={newQuiltContext}>
      {content}
    </QuiltFrameworkContextPreact.Provider>
  );
}

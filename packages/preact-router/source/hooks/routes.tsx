import {Suspense} from 'preact/compat';
import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useContext, useEffect, useMemo} from 'preact/hooks';
import {computed, effect, ReadonlySignal} from '@quilted/signals';
import {
  QuiltFrameworkContextPreact,
  useQuiltContext,
} from '@quilted/preact-context';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import {RouterNavigationCache, type Navigation} from '../Navigation.ts';

export function useRoutes<Context = unknown>(
  routes: readonly RouteDefinition<any, any, Context>[],
  {context}: {context?: Context} = {},
) {
  const navigation = useQuiltContext('navigation');
  const parentEntry = useQuiltContext('navigationEntry', {optional: true});

  const routeStack = useMemo(() => {
    const cache = navigation.cache ?? new RouterNavigationCache(navigation);

    return computed(() => {
      const matched = cache.match(navigation.currentRequest, routes, {
        parent: parentEntry,
        context,
      });

      return matched;
    });
  }, [navigation, parentEntry]);

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
      <RouteNavigationRenderer navigation={navigation} entry={entry}>
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

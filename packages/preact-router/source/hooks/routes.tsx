import type {ComponentChild, VNode, RenderableProps} from 'preact';
import {isValidElement, cloneElement} from 'preact';
import {useContext, useEffect, useMemo} from 'preact/hooks';
import {Suspense} from 'preact/compat';
import {
  computed,
  effect,
  untracked,
  type ReadonlySignal,
} from '@quilted/signals';
import {
  QuiltFrameworkContextPreact,
  useQuiltContext,
} from '@quilted/preact-context';

import type {RouteDefinition, RouteNavigationEntry} from '../types.ts';
import type {Navigation} from '../Navigation.ts';

export function useRoutes<Context = unknown>(
  routes: readonly RouteDefinition<any, any, Context>[],
  {context}: {context?: Context} = {},
) {
  const navigation = useQuiltContext('navigation');
  const parentEntry = useQuiltContext('navigationEntry', {optional: true});

  const routeStack = useMemo(() => {
    const cache = navigation.cache;

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
        key={entry.id}
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

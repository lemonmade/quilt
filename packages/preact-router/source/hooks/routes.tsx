import type {VNode, ComponentChildren} from 'preact';
import {memo} from 'preact/compat';
import {useContext, useEffect, useMemo, useRef} from 'preact/hooks';
import {getMatchDetails, type NavigateTo, type Prefix} from '@quilted/routing';
import {usePerformanceNavigation} from '@quilted/preact-performance';

import type {EnhancedURL, RouteDefinition} from '../types.ts';
import {PreloaderContext, ConsumedPathContext} from '../context.ts';
import type {Router} from '../router.ts';
import type {Preloader} from '../preloader.ts';
import type {StaticRenderer} from '../static.ts';

import {useRedirect} from './redirect.ts';
import {useCurrentUrl} from './url.ts';
import {useRouter} from './router.ts';
import {useConsumedPath} from './consumed.ts';
import {useStaticRenderer} from './static.ts';

export interface Options {
  notFound?:
    | boolean
    | ComponentChildren
    | ((details: {url: EnhancedURL}) => ComponentChildren);
}

const DEFAULT_DEPENDENCIES: readonly any[] = [];

export function useRoutes(
  routes: readonly RouteDefinition[],
  dependencies?: readonly any[],
): VNode<unknown>;
export function useRoutes(
  routes: readonly RouteDefinition[],
  options: Options,
  dependencies?: readonly any[],
): VNode<unknown>;
export function useRoutes(
  routes: readonly RouteDefinition[],
  optionsOrDependencies?: Options | readonly any[],
  forSureDependencies?: readonly any[],
): VNode<unknown> {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  let dependencies = DEFAULT_DEPENDENCIES;
  let notFound: NonNullable<Options['notFound']> = true;

  if (Array.isArray(optionsOrDependencies)) {
    dependencies = optionsOrDependencies;
  } else {
    notFound = (optionsOrDependencies as Options | undefined)?.notFound ?? true;

    if (forSureDependencies) {
      dependencies = forSureDependencies;
    }
  }

  const memoizedRoutes = useMemo(() => routes, dependencies);

  useRoutePreloadRegistration(memoizedRoutes, consumedPath);

  const staticRender = useStaticRenderer(memoizedRoutes, {
    fallback: Boolean(notFound),
    prefix: currentUrl.prefix,
    consumedPath,
  });

  return (
    <RoutesInternal
      routes={routes}
      router={router}
      currentUrl={currentUrl}
      consumedPath={consumedPath}
      notFound={notFound}
      staticRender={staticRender}
    />
  );
}

function useRoutePreloadRegistration(
  routes: readonly RouteDefinition[],
  consumedPath?: string,
) {
  const preloader = useContext(PreloaderContext) ?? undefined;

  const internals = useRef<{
    preloader?: Preloader;
    onChange?: ReturnType<Preloader['registerRoutes']>;
  }>({preloader});

  useEffect(() => {
    if (preloader !== internals.current.preloader) {
      internals.current.onChange?.([]);
      internals.current.preloader = preloader;
      delete internals.current.onChange;
    }

    if (preloader == null) return;

    let onChange = internals.current.onChange;

    if (onChange) {
      onChange(routes, consumedPath);
    } else {
      onChange = preloader.registerRoutes(routes, consumedPath);
      internals.current.onChange = onChange;
    }

    return () => {
      onChange?.([]);
    };
  }, [preloader, routes, consumedPath]);
}

interface Props {
  routes: readonly RouteDefinition[];
  router: Router;
  currentUrl: EnhancedURL;
  notFound: NonNullable<Options['notFound']>;
  consumedPath?: string;
  staticRender?: StaticRenderer;
}

const RoutesInternal = memo(function RoutesInternal({
  routes,
  router,
  currentUrl,
  notFound,
  consumedPath: previouslyConsumedPath,
  staticRender,
}: Props) {
  let matchDetails:
    | (ReturnType<typeof getMatchDetails> & {route: RouteDefinition})
    | undefined;

  for (const route of routes) {
    const matchDetailsForRoute = getRouteMatchDetails(
      route,
      currentUrl,
      router.prefix,
      previouslyConsumedPath,
      staticRender?.forceFallback(previouslyConsumedPath ?? '/'),
    );

    if (matchDetailsForRoute != null) {
      matchDetails = {...matchDetailsForRoute, route};
      break;
    }
  }

  if (matchDetails == null) {
    if (typeof notFound === 'function') {
      return notFound({url: currentUrl});
    } else if (typeof notFound === 'object') {
      return notFound;
    } else if (notFound) {
      return <DefaultNotFound />;
    } else {
      return null;
    }
  }

  const {
    route: matchedRoute,
    consumed: consumedPath,
    matched: matchedPath,
  } = matchDetails;

  const {render, redirect, children} = matchedRoute;
  let routeContents: ComponentChildren = null;

  const nestedConsumedPath = consumedPath ?? previouslyConsumedPath;

  if (typeof render === 'function') {
    routeContents = render({
      url: currentUrl,
      matched: matchedPath,
      consumed: nestedConsumedPath,
      previouslyConsumed: previouslyConsumedPath,
      children: children && (
        <RoutesInternal
          routes={children}
          router={router}
          currentUrl={currentUrl}
          consumedPath={nestedConsumedPath}
          notFound={notFound}
        />
      ),
    });
  } else if (render != null) {
    routeContents = render;
  } else if (children) {
    routeContents = (
      <RoutesInternal
        routes={children}
        router={router}
        currentUrl={currentUrl}
        consumedPath={nestedConsumedPath}
        notFound={notFound}
      />
    );
  } else if (redirect) {
    routeContents = <Redirect to={redirect} />;
  }

  return nestedConsumedPath ? (
    <ConsumedPathContext.Provider value={nestedConsumedPath}>
      {routeContents}
    </ConsumedPathContext.Provider>
  ) : (
    <>{routeContents}</>
  );
});

// There is a version of this component in the /components directory, but
// it’s a bit of a weird situation where this hook needs a component and
// the component needs some hooks. Not doing this makes it too easy to create
// awkward circular dependencies. The definition is also very tiny, since
// it is really just a component wrapper on the hook.
function Redirect({to}: {to: NavigateTo}) {
  useRedirect(to);
  return null;
}

function getRouteMatchDetails(
  route: RouteDefinition,
  currentUrl: EnhancedURL,
  prefix?: Prefix,
  consumed?: string,
  forceFallback?: boolean,
) {
  if (Array.isArray(route.match)) {
    for (const match of route.match) {
      const matchDetails = getMatchDetails(
        currentUrl,
        match,
        prefix,
        consumed,
        route.children == null && (route.exact ?? true),
        forceFallback,
      );

      if (matchDetails) return matchDetails;
    }

    return;
  }

  return getMatchDetails(
    currentUrl,
    route.match,
    prefix,
    consumed,
    route.children == null && (route.exact ?? true),
    forceFallback,
  );
}

function DefaultNotFound() {
  usePerformanceNavigation({optional: true, state: 'complete'});
  return null;
}

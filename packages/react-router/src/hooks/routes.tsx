/* eslint react/jsx-no-useless-fragment: off */

import {memo, useContext, useEffect, useRef} from 'react';
import type {ReactNode, ReactElement} from 'react';
import {NotFound} from '@quilted/react-http';
import type {NavigateTo} from '@quilted/routing';

import type {EnhancedURL, RouteDefinition} from '../types';
import {PreloaderContext, ConsumedPathContext} from '../context';
import {getMatchDetails} from '../utilities';
import type {Router} from '../router';
import type {Preloader} from '../preloader';
import type {StaticRenderer} from '../static';

import {useRedirect} from './redirect';
import {useCurrentUrl} from './url';
import {useRouter} from './router';
import {useConsumedPath} from './consumed';
import {useStaticRenderer} from './static';

export interface Options {
  notFound?: boolean | (() => ReactElement);
}

export function useRoutes(
  routes: RouteDefinition[],
  {notFound = routes[routes.length - 1].match != null}: Options = {},
) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  useRoutePreloadRegistration(routes, consumedPath);

  const staticRender = useStaticRenderer(routes, {
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
  routes: RouteDefinition[],
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
  routes: RouteDefinition[];
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
    const matchDetailsForRoute = getMatchDetails(
      currentUrl,
      router,
      previouslyConsumedPath,
      route.match,
      staticRender?.forceFallback(previouslyConsumedPath ?? '/'),
    );

    if (matchDetailsForRoute != null) {
      matchDetails = {...matchDetailsForRoute, route};
      break;
    }
  }

  if (matchDetails == null) {
    if (typeof notFound === 'function') {
      return notFound();
    } else if (notFound) {
      return <NotFound />;
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
  let routeContents: ReactNode = null;

  const nestedConsumedPath = consumedPath ?? previouslyConsumedPath;

  if (render) {
    routeContents = render({
      url: currentUrl,
      matched: matchedPath,
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

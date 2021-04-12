/* eslint react/jsx-no-useless-fragment: off */

import {memo, useContext, useEffect, useRef} from 'react';
import type {ReactNode, ReactElement} from 'react';
import {NotFound} from '@quilted/react-http';
import type {NavigateTo} from '@quilted/routing';

import type {EnhancedURL, RouteDefinition} from '../types';
import {PrefetcherContext, ConsumedPathContext} from '../context';
import {getMatchDetails} from '../utilities';
import type {Router} from '../router';
import type {Prefetcher} from '../prefetcher';

import {useRedirect} from './redirect';
import {useCurrentUrl} from './url';
import {useRouter} from './router';
import {useConsumedPath} from './consumed';

export interface Options {
  notFound?: boolean | (() => ReactElement);
}

export function useRoutes(
  routes: RouteDefinition[],
  {notFound = true}: Options = {},
) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  useRoutePrefetchRegistration(routes, consumedPath);

  return (
    <RoutesInternal
      routes={routes}
      router={router}
      currentUrl={currentUrl}
      consumedPath={consumedPath}
      notFound={notFound}
    />
  );
}

function useRoutePrefetchRegistration(
  routes: RouteDefinition[],
  consumedPath?: string,
) {
  const prefetcher = useContext(PrefetcherContext) ?? undefined;

  const internals = useRef<{
    prefetcher?: Prefetcher;
    onChange?: ReturnType<Prefetcher['registerRoutes']>;
  }>({prefetcher});

  useEffect(() => {
    if (prefetcher !== internals.current.prefetcher) {
      internals.current.onChange?.([]);
      internals.current.prefetcher = prefetcher;
      delete internals.current.onChange;
    }

    if (prefetcher == null) return;

    let onChange = internals.current.onChange;

    if (onChange) {
      onChange(routes, consumedPath);
    } else {
      onChange = prefetcher.registerRoutes(routes, consumedPath);
      internals.current.onChange = onChange;
    }

    return () => {
      onChange?.([]);
    };
  }, [prefetcher, routes, consumedPath]);
}

interface Props {
  routes: RouteDefinition[];
  router: Router;
  currentUrl: EnhancedURL;
  notFound: NonNullable<Options['notFound']>;
  consumedPath?: string;
}

const RoutesInternal = memo(function RoutesInternal({
  routes,
  router,
  currentUrl,
  notFound,
  consumedPath: previouslyConsumedPath,
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

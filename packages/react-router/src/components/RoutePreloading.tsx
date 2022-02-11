import {useMemo, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {enhanceUrl} from '@quilted/routing';
import type {EnhancedURL} from '@quilted/routing';

import {useRouter} from '../hooks';
import {PreloaderContext, PreloadRegistrarContext} from '../context';
import type {Router} from '../router';
import type {
  Match,
  Preloader,
  PreloadRegistrar,
  RouteDefinition,
} from '../types';
import {getMatchDetails} from '../utilities';

interface PreloadMatch {
  id: string;
  url: URL;
  matched: string;
  render: NonNullable<RouteDefinition['renderPreload']>;
}

interface PreloadRegistration {
  id: string;
  matches: [match: Match | undefined, exact: boolean][];
  render: NonNullable<RouteDefinition['renderPreload']>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function RoutePreloading({children}: PropsWithChildren<{}>) {
  const router = useRouter();
  const [preloadMatches, setPreloadMatches] = useState<PreloadMatch[]>([]);

  const [preloader, registrar] = useMemo<[Preloader, PreloadRegistrar]>(() => {
    let currentPreloadId = 0;
    const preloadingCounts = new Map<string, number>();
    const preloading = new Set<URL>();
    const registered = new Set<PreloadRegistration>();

    const preloader: Preloader = {
      level: preloadLevel(),
      add(url) {
        const {href} = url;

        if (preloadingCounts.has(href)) {
          preloadingCounts.set(href, preloadingCounts.get(href)! + 1);
        } else {
          preloadingCounts.set(href, 1);
          preloading.add(url);
          triggerUpdate();
        }

        return () => {
          const currentCount = preloadingCounts.get(href) ?? 1;
          const newCount = currentCount - 1;

          if (newCount <= 0) {
            preloadingCounts.delete(href);
            preloading.delete(url);
            triggerUpdate();
          } else {
            preloadingCounts.set(href, newCount);
          }
        };
      },
    };

    const registrar: PreloadRegistrar = {
      register(routes, consumed) {
        const registrationsByKey = new Map<string, PreloadRegistration>();

        update(routes, consumed);

        return update;

        function update(newRoutes: RouteDefinition[], newConsumed?: string) {
          let needsUpdate = false;
          const removeRegistrations = new Set(registrationsByKey.keys());

          function processRoute(
            route: RouteDefinition,
            parentMatches: PreloadRegistration['matches'] = [],
          ) {
            const {
              children,
              match,
              exact = children == null,
              renderPreload,
            } = route;

            const matches: PreloadRegistration['matches'] = match
              ? [...parentMatches, [match, exact]]
              : parentMatches;

            if (renderPreload != null) {
              const registrationKey = `Registration:${
                newConsumed ?? ''
              }:${matches.map(([match]) => stringifyMatch(match)).join(',')}`;

              removeRegistrations.delete(registrationKey);

              const currentRegistration =
                registrationsByKey.get(registrationKey);

              if (currentRegistration == null) {
                needsUpdate = true;

                const registration: PreloadRegistration = {
                  id: createPreloadId(),
                  matches,
                  render: renderPreload,
                };

                registered.add(registration);
                registrationsByKey.set(registrationKey, registration);
              } else if (currentRegistration.render !== renderPreload) {
                needsUpdate = true;
                currentRegistration.render = renderPreload;
              }
            }

            if (children != null) {
              for (const child of children) {
                processRoute(child, matches);
              }
            }
          }

          for (const route of newRoutes) {
            processRoute(route);
          }

          if (removeRegistrations.size > 0) {
            needsUpdate = true;

            for (const registrationKey of removeRegistrations) {
              const registration = registrationsByKey.get(registrationKey)!;
              registrationsByKey.delete(registrationKey);
              registered.delete(registration);
            }
          }

          if (needsUpdate) triggerUpdate();
        }
      },
    };

    return [preloader, registrar];

    function triggerUpdate() {
      const preloadMatches: PreloadMatch[] = [];

      for (const url of preloading) {
        for (const {id, matches, render} of registered) {
          const enhancedUrl = enhanceUrl(url, router.prefix);
          const urlMatch = getUrlMatch(enhancedUrl, router, matches);

          if (typeof urlMatch === 'string') {
            preloadMatches.push({
              id,
              url: enhancedUrl,
              matched: urlMatch,
              render,
            });
          }
        }
      }

      setPreloadMatches(preloadMatches);
    }

    function createPreloadId() {
      return `Preload${currentPreloadId++}`;
    }
  }, [router]);

  const preloadContent = preloadMatches.map(({id, url, matched, render}) => {
    return <div key={id}>{render({url, matched})}</div>;
  });

  return (
    <PreloaderContext.Provider value={preloader}>
      <PreloadRegistrarContext.Provider value={registrar}>
        {children}
        {preloadContent}
      </PreloadRegistrarContext.Provider>
    </PreloaderContext.Provider>
  );
}

function stringifyMatch(match?: Match) {
  if (match == null) {
    return '';
  } else if (typeof match === 'string') {
    return match;
  } else if (match instanceof RegExp) {
    return match.source;
  } else {
    return match.toString();
  }
}

interface NavigatorWithConnection {
  connection: {saveData: boolean};
}

function preloadLevel(): Preloader['level'] {
  return typeof navigator === 'undefined' ||
    !('connection' in navigator) ||
    !(navigator as NavigatorWithConnection).connection.saveData
    ? 'high'
    : 'low';
}

function getUrlMatch(
  url: EnhancedURL,
  router: Router,
  matchers: PreloadRegistration['matches'],
) {
  if (matchers.length === 0) return '';

  let currentlyConsumed: string | undefined;
  let lastMatch = '';

  for (const [match, exact] of matchers) {
    const matchDetails = getMatchDetails(
      url,
      router,
      currentlyConsumed,
      match,
      exact,
    );

    if (matchDetails == null) {
      return false;
    } else {
      currentlyConsumed = matchDetails.consumed ?? currentlyConsumed;
      lastMatch = matchDetails.matched;
    }
  }

  return lastMatch;
}

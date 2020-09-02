import type {Match, RouteDefinition} from './types';
import type {Router} from './router';
import {getMatchDetails} from './utilities';

export interface PrefetchMatch {
  id: string;
  matches: Match[];
  render: NonNullable<RouteDefinition['renderPrefetch']>;
}

export interface Prefetcher {
  registerRoutes(
    routes: RouteDefinition[],
    consumed?: string,
  ): (routes: RouteDefinition[], consumed?: string) => void;
  listenForMatch(
    url: URL,
    onMatch: (matches: PrefetchMatch[]) => void,
  ): () => void;
  getMatches(url: URL): PrefetchMatch[];
}

export function createPrefetcher(router: Router): Prefetcher {
  let currentId = 0;
  const listeners = new Set<() => void>();
  const registered = new Set<PrefetchMatch>();

  return {
    registerRoutes(routes, consumed) {
      const registrationsByKey = new Map<string, PrefetchMatch>();

      update(routes, consumed);

      return update;

      function update(newRoutes: RouteDefinition[], newConsumed?: string) {
        let needsUpdate = false;
        const removeRegistrations = new Set(registrationsByKey.keys());

        function processRoute(
          route: RouteDefinition,
          parentMatches: Match[] = [],
        ) {
          const {children, match, renderPrefetch} = route;

          const matches = match ? [...parentMatches, match] : parentMatches;

          if (renderPrefetch != null) {
            const registrationKey = `Registration:${
              newConsumed ?? ''
            }:${matches.map((match) => stringifyMatch(match)).join(',')}`;

            removeRegistrations.delete(registrationKey);

            const currentRegistration = registrationsByKey.get(registrationKey);

            if (currentRegistration == null) {
              needsUpdate = true;

              const registration: PrefetchMatch = {
                id: createId(),
                matches,
                render: renderPrefetch,
              };

              registered.add(registration);
              registrationsByKey.set(registrationKey, registration);
            } else if (currentRegistration.render !== renderPrefetch) {
              needsUpdate = true;
              currentRegistration.render = renderPrefetch;
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
    getMatches,
    listenForMatch(url, onMatch) {
      function listener() {
        onMatch(getMatches(url));
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  function getMatches(url: URL) {
    return [...registered].filter((registration) => {
      return urlMatches(url, router, registration.matches);
    });
  }

  function triggerUpdate() {
    for (const listener of listeners) {
      listener();
    }
  }

  function createId() {
    return `Prefetch${currentId++}`;
  }
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

function urlMatches(url: URL, router: Router, matchers: Match[]) {
  if (matchers.length === 0) return true;

  let currentlyConsumed: string | undefined;

  for (const matcher of matchers) {
    const matchDetails = getMatchDetails(
      url,
      router,
      currentlyConsumed,
      matcher,
    );

    if (matchDetails == null) {
      return false;
    } else {
      currentlyConsumed = matchDetails.consumed ?? currentlyConsumed;
    }
  }

  return true;
}

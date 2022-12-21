import {enhanceUrl} from '@quilted/routing';
import {getMatchDetails} from '@quilted/routing';
import type {Match, EnhancedURL} from '@quilted/routing';

import type {RouteDefinition} from './types';
import type {Router} from './router';

interface PreloadRegistration {
  id: string;
  matches: (Match | Match[])[];
  render: NonNullable<RouteDefinition['renderPreload']>;
}

export interface PreloadMatch {
  id: string;
  matched: string;
  render: NonNullable<RouteDefinition['renderPreload']>;
}

export interface Preloader {
  registerRoutes(
    routes: RouteDefinition[],
    consumed?: string,
  ): (routes: RouteDefinition[], consumed?: string) => void;
  listenForMatch(
    url: URL,
    onMatch: (matches: PreloadMatch[]) => void,
  ): () => void;
  getMatches(url: URL): PreloadMatch[];
}

export function createPreloader(router: Router): Preloader {
  let currentId = 0;
  const listeners = new Set<() => void>();
  const registered = new Set<PreloadRegistration>();

  return {
    registerRoutes(routes, consumed) {
      const registrationsByKey = new Map<string, PreloadRegistration>();

      update(routes, consumed);

      return update;

      function update(newRoutes: RouteDefinition[], newConsumed?: string) {
        let needsUpdate = false;
        const removeRegistrations = new Set(registrationsByKey.keys());

        function processRoute(
          route: RouteDefinition,
          parentMatches: (Match | Match[])[] = [],
        ) {
          const {children, match, renderPreload} = route;

          const matches = match ? [...parentMatches, match] : parentMatches;

          if (renderPreload != null) {
            const registrationKey = `Registration:${newConsumed ?? ''}:${matches
              .map((match) => stringifyMatch(match))
              .join(',')}`;

            removeRegistrations.delete(registrationKey);

            const currentRegistration = registrationsByKey.get(registrationKey);

            if (currentRegistration == null) {
              needsUpdate = true;

              const registration: PreloadRegistration = {
                id: createId(),
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
    const matches: PreloadMatch[] = [];
    const enhancedUrl = enhanceUrl(url, router.prefix);

    for (const registration of registered) {
      const urlMatch = getUrlMatch(enhancedUrl, router, registration.matches);

      if (typeof urlMatch === 'string') {
        matches.push({
          id: registration.id,
          matched: urlMatch,
          render: registration.render,
        });
      }
    }

    return matches;
  }

  function triggerUpdate() {
    for (const listener of listeners) {
      listener();
    }
  }

  function createId() {
    return `Preload${currentId++}`;
  }
}

function stringifyMatch(match?: Match | Match[]): string {
  if (match == null) {
    return '';
  } else if (typeof match === 'string') {
    return match;
  } else if (match instanceof RegExp) {
    return match.source;
  } else if (Array.isArray(match)) {
    return match.map(stringifyMatch).join(',');
  } else {
    return match.toString();
  }
}

function getUrlMatch(
  url: EnhancedURL,
  router: Router,
  matchers: (Match | Match[])[],
) {
  if (matchers.length === 0) return '';

  let currentlyConsumed: string | undefined;
  let lastMatch = '';

  for (const matcher of matchers) {
    if (Array.isArray(matcher)) {
      let hasMatch = false;

      for (const subMatcher of matcher) {
        const matchDetails = getMatchDetails(
          url,
          subMatcher,
          router.prefix,
          currentlyConsumed,
          false,
        );

        if (matchDetails != null) {
          hasMatch = true;
          currentlyConsumed = matchDetails.consumed ?? currentlyConsumed;
          lastMatch = matchDetails.matched;
          break;
        }
      }

      if (!hasMatch) {
        return false;
      }

      continue;
    }

    const matchDetails = getMatchDetails(
      url,
      matcher,
      router.prefix,
      currentlyConsumed,
      false,
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

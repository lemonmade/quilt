import {resolveUrl} from '@quilted/routing';
import type {Prefix, NavigateTo, RelativeTo} from '@quilted/routing';

import type {EnhancedURL, NavigationBlocker, State} from './types';
import {enhanceUrl, createKey} from './utilities';

export const SERVER_RENDER_EFFECT_ID = Symbol('router');

export interface Options {
  state?: State;
  prefix?: Prefix;
  isExternal?(url: URL, currentUrl: URL): boolean;
}

type Listener = (url: EnhancedURL) => void;

export interface NavigateOptions {
  replace?: boolean;
  relativeTo?: RelativeTo;
  state?: State;
}

const KEY_STATE_FIELD_NAME = '_key';

export interface Router {
  readonly currentUrl: EnhancedURL;
  readonly prefix?: Prefix;

  /**
   * Navigates the browser to the location represented by the `to` argument.
   * This function will first resolve any navigation blocks that have been
   * registered and, if no one is blocking this navigation, pushes a new entry
   * onto the history stack.
   */
  navigate(to: NavigateTo, options?: NavigateOptions): void;
  listen(listener: Listener): () => void;
  block(blocker?: NavigationBlocker): () => void;
  go(count: number): void;
  back(count?: number): void;
  forward(count?: number): void;
  resolve(
    to: NavigateTo,
    options?: {relativeTo?: RelativeTo},
  ): {readonly url: URL; readonly external: boolean};
}

export function createRouter(
  initialUrl?: URL,
  {prefix, state: initialState, isExternal: explicitIsExternal}: Options = {},
): Router {
  let currentUrl = initialUrl
    ? enhanceUrl(
        new URL(initialUrl.href),
        initialState ?? {},
        createKey(),
        prefix,
      )
    : createUrl(prefix);

  const isExternal =
    explicitIsExternal ??
    ((url, currentUrl) => url.origin !== currentUrl.origin);

  let forceNextNavigation = false;

  const initialNavigationKey = currentUrl.key;
  const navigationKeys = [initialNavigationKey];

  const listeners = new Set<Listener>();
  const blockers = new Set<NavigationBlocker>();

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopstate);
  }

  return {
    get currentUrl() {
      return currentUrl;
    },
    get prefix() {
      return prefix;
    },
    navigate,
    listen(listener: Listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    block(blocker = () => true) {
      blockers.add(blocker);

      return () => {
        blockers.delete(blocker);
      };
    },
    go,
    back: (count = -1) => go(count),
    forward: (count = 1) => go(count),
    resolve: (to, {relativeTo} = {}) => {
      const url = resolveUrl(to, currentUrl, relativeTo);
      return {url, external: isExternal(url, currentUrl)};
    },
  };

  function navigate(
    to: NavigateTo,
    {state = {}, replace: explicitReplace, relativeTo}: NavigateOptions = {},
  ) {
    const resolvedKey = createKey();
    const resolvedUrl = enhanceUrl(
      resolveUrl(to, currentUrl, relativeTo),
      state,
      resolvedKey,
      prefix,
    );

    const replace = explicitReplace ?? resolvedUrl.href === currentUrl.href;
    const finalState = {...state, [KEY_STATE_FIELD_NAME]: resolvedKey};

    let hasAllowedBlockedNavigation = false;

    const allow = () => {
      if (hasAllowedBlockedNavigation) return;

      hasAllowedBlockedNavigation = true;
      forceNextNavigation = true;
      navigate(resolvedUrl, {state, replace, relativeTo});
    };

    if (!forceNextNavigation && shouldBlock(resolvedUrl, allow)) {
      return;
    }

    forceNextNavigation = false;

    const resolvedPath = urlToPath(resolvedUrl);

    try {
      history[replace ? 'replaceState' : 'pushState'](
        finalState,
        '',
        resolvedPath,
      );
    } catch (error) {
      window.location[replace ? 'replace' : 'assign'](resolvedPath);
      return;
    }

    const entryIndex = navigationKeys.lastIndexOf(currentUrl.key);

    if (replace) {
      navigationKeys.splice(entryIndex, 1, resolvedKey);
    } else {
      navigationKeys.splice(
        entryIndex + 1,
        navigationKeys.length - entryIndex - 1,
        resolvedKey,
      );
    }

    currentUrl = createUrl(prefix, resolvedKey);

    for (const listener of listeners) {
      listener(currentUrl);
    }
  }

  function handlePopstate() {
    const fallbackNavigationKey = navigationKeys[0];
    const newUrl = createUrl(prefix, fallbackNavigationKey);

    const currentNavigationIndex = navigationKeys.lastIndexOf(
      window.history.state?.[KEY_STATE_FIELD_NAME] ?? fallbackNavigationKey,
    );

    const previousNavigationIndex = navigationKeys.lastIndexOf(currentUrl.key);
    const delta = previousNavigationIndex - currentNavigationIndex;

    let hasAllowedBlockedNavigation = false;

    const allow = () => {
      if (hasAllowedBlockedNavigation) return;

      hasAllowedBlockedNavigation = true;

      if (delta) {
        forceNextNavigation = true;
        go(delta);
      }
    };

    if (!forceNextNavigation && shouldBlock(newUrl, allow)) {
      forceNextNavigation = true;
      go(-delta);
      return;
    }

    forceNextNavigation = false;
    currentUrl = newUrl;

    for (const listener of listeners) {
      listener(currentUrl);
    }
  }

  function shouldBlock(targetUrl: EnhancedURL, allow: () => void) {
    const details = {targetUrl, allow};
    return [...blockers].some((blocker) => blocker(details));
  }

  function go(count: number) {
    window.history.go(count);
  }
}

function createUrl(prefix?: Prefix, defaultKey?: string): EnhancedURL {
  const {[KEY_STATE_FIELD_NAME]: key, ...state} = window.history.state ?? {};
  return enhanceUrl(
    new URL(window.location.href),
    state,
    key ?? defaultKey ?? createKey(),
    prefix,
  );
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

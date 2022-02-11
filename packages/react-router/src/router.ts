import {resolveUrl} from '@quilted/routing';
import type {Prefix, NavigateTo, RelativeTo} from '@quilted/routing';

import type {
  State,
  EnhancedURL,
  NavigationBlocker,
  NavigationBlockDetails,
} from './types';
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

const BROWSER_STATE_FIELD_NAME_KEY = '_key';
const BROWSER_STATE_FIELD_NAME_INDEX = '_index';

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
        0,
        prefix,
      )
    : createUrl(prefix);

  const isExternal =
    explicitIsExternal ??
    ((url, currentUrl) => url.origin !== currentUrl.origin);

  let forceNextNavigation = false;

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
    const baseTargetUrl = resolveUrl(to, currentUrl, relativeTo);
    const replace = explicitReplace ?? baseTargetUrl.href === currentUrl.href;

    const resolvedIndex = replace ? currentUrl.index : currentUrl.index + 1;

    const resolvedUrl = enhanceUrl(
      baseTargetUrl,
      state,
      resolvedKey,
      resolvedIndex,
      prefix,
    );

    const finalState = {
      ...state,
      [BROWSER_STATE_FIELD_NAME_KEY]: resolvedKey,
      [BROWSER_STATE_FIELD_NAME_INDEX]: resolvedIndex,
    };

    let hasAllowedBlockedNavigation = false;

    const allow = () => {
      if (hasAllowedBlockedNavigation) return;

      hasAllowedBlockedNavigation = true;
      forceNextNavigation = true;
      navigate(resolvedUrl, {state, replace, relativeTo});
    };

    if (!forceNextNavigation && shouldBlock(resolvedUrl, allow, 'navigation')) {
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

    currentUrl = resolvedUrl;

    for (const listener of listeners) {
      listener(currentUrl);
    }
  }

  function handlePopstate() {
    const newUrl = createUrl(prefix);
    const delta = newUrl.index - currentUrl.index;

    let hasAllowedBlockedNavigation = false;

    const allow = () => {
      if (hasAllowedBlockedNavigation) return;

      hasAllowedBlockedNavigation = true;

      if (delta) {
        forceNextNavigation = true;
        go(delta);
      }
    };

    if (!forceNextNavigation && shouldBlock(newUrl, allow, 'user-agent')) {
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

  function shouldBlock(
    targetUrl: EnhancedURL,
    allow: () => void,
    reason: NavigationBlockDetails['reason'],
  ) {
    if (blockers.size === 0) return false;

    const details = {reason, targetUrl, allow};

    let shouldBlock = false;
    const promiseResults: Promise<void>[] = [];

    for (const blocker of blockers) {
      const blockResult = blocker(details) ?? false;

      if (typeof blockResult === 'object' && 'then' in blockResult) {
        shouldBlock = true;
        promiseResults.push(blockResult);
      } else if (blockResult) {
        shouldBlock = true;
      }
    }

    if (promiseResults.length > 0) {
      Promise.race(promiseResults).then(() => allow());
    }

    return shouldBlock;
  }

  function go(count: number) {
    window.history.go(count);
  }
}

function createUrl(prefix?: Prefix): EnhancedURL {
  const {
    [BROWSER_STATE_FIELD_NAME_KEY]: key = createKey(),
    [BROWSER_STATE_FIELD_NAME_INDEX]: index = 0,
    ...state
  } = window.history.state ?? {};

  return enhanceUrl(new URL(window.location.href), state, key, index, prefix);
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

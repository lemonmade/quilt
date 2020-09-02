import type {EnhancedURL, Prefix, NavigateTo, Blocker, Search} from './types';
import {postfixSlash, enhanceUrl, createKey} from './utilities';

export const SERVER_RENDER_EFFECT_ID = Symbol('router');

export interface State {
  [key: string]: unknown;
}

export interface Options {
  state?: State;
  prefix?: Prefix;
}

type Listener = (url: EnhancedURL) => void;

export interface NavigateOptions {
  replace?: boolean;
  state?: State;
}

const KEY_STATE_FIELD_NAME = '_key';

export interface Router {
  readonly currentUrl: EnhancedURL;
  readonly prefix?: Prefix;
  navigate(to: NavigateTo, options?: NavigateOptions): void;
  listen(listener: Listener): () => void;
  block(blocker?: Blocker): () => void;
  go(count: number): void;
  back(count?: number): void;
  forward(count?: number): void;
}

export function createRouter(
  initialUrl?: URL,
  {prefix, state: initialState}: Options = {},
): Router {
  let currentUrl = initialUrl
    ? enhanceUrl(initialUrl, initialState ?? {}, createKey(), prefix)
    : createUrl(prefix);

  let forceNextNavigation = false;

  const initialNavigationKey = currentUrl.key;
  const navigationKeys = [initialNavigationKey];

  const listeners = new Set<Listener>();
  const blockers = new Set<Blocker>();

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
  };

  function navigate(
    to: NavigateTo,
    {state = {}, replace = false}: NavigateOptions = {},
  ) {
    const resolvedKey = createKey();
    const resolvedUrl = enhanceUrl(
      resolveUrl(to, currentUrl),
      state,
      resolvedKey,
      prefix,
    );

    const finalState = {...state, [KEY_STATE_FIELD_NAME]: resolvedKey};

    const redo = () => {
      forceNextNavigation = true;
      navigate(resolvedUrl, {state, replace});
    };

    if (!forceNextNavigation && shouldBlock(resolvedUrl, redo)) {
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

    const redo = () => {
      if (delta) {
        forceNextNavigation = true;
        go(delta);
      }
    };

    if (!forceNextNavigation && shouldBlock(newUrl, redo)) {
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

  function shouldBlock(to: EnhancedURL, redo: () => void) {
    return [...blockers].some((blocker) => blocker(to, redo));
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

function resolveUrl(to: NavigateTo, from: EnhancedURL): URL {
  if (to instanceof URL) {
    if (to.origin !== from.origin) {
      throw new Error(
        `You can’t perform a client side navigation to ${to.href} from ${from.href}`,
      );
    }

    return to;
  } else if (typeof to === 'object') {
    const {pathname, search, hash} = to;

    // should make sure we insert the hash/ question mark
    const finalPathname = pathname ?? from.pathname;
    const finalSearch = searchToString(search ?? from.search);
    const finalHash = prefixIfNeeded('#', hash ?? from.hash);

    return new URL(
      prefixPath(`${finalPathname}${finalSearch}${finalHash}`, from.prefix),
      from.href,
    );
  } else if (typeof to === 'function') {
    return resolveUrl(to(from), from);
  }

  return new URL(prefixPath(to, from.prefix), postfixSlash(from.href));
}

function prefixPath(pathname: string, prefix?: string) {
  if (!prefix) return pathname;

  return pathname.indexOf('/') === 0
    ? `${postfixSlash(prefix)}${pathname.slice(1)}`
    : pathname;
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function searchToString(search?: Search) {
  if (search == null) {
    return '';
  } else if (typeof search === 'string') {
    return prefixIfNeeded('?', search);
  } else if (search instanceof URLSearchParams) {
    return prefixIfNeeded('?', search.toString());
  } else {
    return prefixIfNeeded(
      '?',
      Object.keys(search).reduce<string>((searchString, key) => {
        return `${searchString}${key}=${encodeURIComponent(
          (search as any)[key],
        )}`;
      }, ''),
    );
  }
}

function prefixIfNeeded(prefix: string, value: string) {
  return value.length === 0 || value[0] === prefix
    ? value
    : `${prefix}${value}`;
}

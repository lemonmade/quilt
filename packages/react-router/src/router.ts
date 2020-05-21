import {ServerRenderEffectKind} from '@quilted/react-server-render';

import {EnhancedURL, Match} from './types';
import {postfixSlash} from './utilities';

export const SERVER_RENDER_EFFECT_ID = Symbol('router');

export interface State {
  switchFallbacks?: string[];
}

type Prefix = string | RegExp;

export interface Options {
  state?: State;
  prefix?: Prefix;
}

type Listener = (url: EnhancedURL) => void;

interface PrefetchRegistration {
  match: Match;
  render(url: URL): React.ReactNode;
}

type Search = string | object | URLSearchParams;

// should accept a function that resolves to one of these
export type NavigateTo =
  | string
  | URL
  | {
      pathname?: string;
      hash?: string;
      search?: Search;
    };

export type Blocker = (to: EnhancedURL, redo: () => void) => boolean;

export interface NavigateOptions {
  replace?: boolean;
  state?: {[key: string]: unknown};
}

export const EFFECT = Symbol('effect');
export const EXTRACT = Symbol('extract');
export const REGISTER = Symbol('register');
export const REGISTERED = Symbol('registered');
export const CREATE_SWITCH_ID = Symbol('createSwitchId');
export const MARK_SWITCH_FALLBACK = Symbol('markSwitchAsFallback');
export const SWITCH_IS_FALLBACK = Symbol('switchIsFallback');

// should move NoMatch stuff to its own controller
export class Router {
  currentUrl: EnhancedURL;

  readonly [EFFECT]: ServerRenderEffectKind = {
    id: SERVER_RENDER_EFFECT_ID,
    betweenEachPass: () => this.reset(),
  };

  readonly [REGISTERED] = new Set<PrefetchRegistration>();

  private readonly switchFallbacks = new Set<string>();
  private readonly prefix: Prefix | undefined;
  private currentSwitchId = 0;
  private blockers = new Set<Blocker>();
  private listeners = new Set<Listener>();
  private forceNextNavigation = false;
  private keys: string[] = [];

  constructor(
    url: URL,
    {prefix, state: {switchFallbacks = []} = {}}: Options = {},
  ) {
    for (const switchToFallback of switchFallbacks) {
      this.switchFallbacks.add(switchToFallback);
    }

    this.prefix = prefix;

    const currentUrl = enhanceUrl(url, {}, this.prefix);
    this.currentUrl = currentUrl;

    if (currentUrl.state.key) {
      this.keys.push(currentUrl.state.key);
    }

    this.addPopstateListener();
  }

  navigate(
    to: NavigateTo,
    {state = {}, replace = false}: NavigateOptions = {},
  ) {
    const key = createKey();
    const finalState = {...state, key};
    const resolvedUrl = enhanceUrl(resolveUrl(to, this.currentUrl), finalState);

    const redo = () => {
      this.forceNextNavigation = true;
      this.navigate(resolvedUrl, {state, replace});
    };

    if (!this.forceNextNavigation && this.shouldBlock(resolvedUrl, redo)) {
      return;
    }

    const resolvedTo = urlToPath(resolvedUrl);

    this.reset();

    try {
      history[replace ? 'replaceState' : 'pushState'](
        finalState,
        '',
        resolvedTo,
      );
    } catch (error) {
      window.location[replace ? 'replace' : 'assign'](resolvedTo);
      return;
    }

    const entryIndex = this.keys.lastIndexOf(this.currentUrl.state.key || '');

    if (replace) {
      this.keys.splice(entryIndex < 0 ? 0 : entryIndex, 1, key);
    } else {
      this.keys = [
        ...this.keys.slice(0, entryIndex < 0 ? 0 : entryIndex + 1),
        key,
      ];
    }

    this.currentUrl = createUrl(this.prefix);

    for (const listener of this.listeners) {
      listener(this.currentUrl);
    }
  }

  go(count: number) {
    window.history.go(count);
  }

  back(count = -1) {
    this.go(count > 0 ? -count : count);
  }

  forward(count = 1) {
    this.go(count);
  }

  block(blocker: Blocker = () => true) {
    this.blockers.add(blocker);

    return () => {
      this.blockers.delete(blocker);
    };
  }

  resolve(to: NavigateTo, from = this.currentUrl) {
    return resolve(to, from);
  }

  resolveUrl(to: NavigateTo, from = this.currentUrl) {
    return resolveUrl(to, from);
  }

  remove() {
    window.removeEventListener('popstate', this.handlePopstate);
  }

  listen(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  [SWITCH_IS_FALLBACK](id: string) {
    return this.switchFallbacks.has(id);
  }

  [MARK_SWITCH_FALLBACK](id: string) {
    this.switchFallbacks.add(id);
  }

  [CREATE_SWITCH_ID]() {
    return String(this.currentSwitchId++);
  }

  [REGISTER](registration: PrefetchRegistration) {
    this[REGISTERED].add(registration);

    return () => {
      this[REGISTERED].delete(registration);
    };
  }

  [EXTRACT](): State {
    return {
      switchFallbacks: [...this.switchFallbacks],
    };
  }

  private reset() {
    this.forceNextNavigation = false;
    this.switchFallbacks.clear();
  }

  // should reverse the meaning of block => true
  private shouldBlock(to: EnhancedURL, redo: () => void) {
    return [...this.blockers].some((blocker) => !blocker(to, redo));
  }

  private handlePopstate = () => {
    const newUrl = createUrl(this.prefix);
    const {revert, redo} = this.getPopBlockHelpers();

    if (!this.forceNextNavigation && this.shouldBlock(newUrl, redo)) {
      revert();
      return;
    }

    this.reset();
    this.currentUrl = newUrl;

    for (const listener of this.listeners) {
      listener(this.currentUrl);
    }
  };

  private addPopstateListener() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('popstate', this.handlePopstate);
  }

  private getPopBlockHelpers() {
    const normalize = (keyIndex: number) => (keyIndex < 0 ? 0 : keyIndex);

    const currentIndex = normalize(
      this.keys.lastIndexOf(window.history.state && window.history.state.key),
    );

    const previousIndex = normalize(
      this.keys.lastIndexOf(this.currentUrl.state.key || ''),
    );

    const delta = previousIndex - currentIndex;

    return {
      revert: () => {
        if (delta) {
          this.forceNextNavigation = true;
          this.go(delta);
        }
      },
      redo: () => {
        if (delta) {
          this.forceNextNavigation = true;
          this.go(-delta);
        }
      },
    };
  }
}

function createUrl(prefix?: Prefix): EnhancedURL {
  return enhanceUrl(
    new URL(window.location.href),
    {...window.history.state},
    prefix,
  );
}

function enhanceUrl(url: URL, state: object, prefix?: Prefix): EnhancedURL {
  Object.defineProperty(url, 'state', {
    value: state,
    writable: true,
  });

  Object.defineProperty(url, 'prefix', {
    value: extractPrefix(url, prefix),
    writable: false,
  });

  return url as EnhancedURL;
}

function resolveUrl(to: NavigateTo, from: EnhancedURL) {
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
    const finalHash = hash ?? from.hash;

    return new URL(
      prefixPath(`${finalPathname}${finalSearch}${finalHash}`, from.prefix),
      from.href,
    );
  }

  return new URL(prefixPath(to, from.prefix), postfixSlash(from.href));
}

function resolve(to: NavigateTo, from: EnhancedURL) {
  if (to instanceof URL) {
    if (to.origin !== from.origin) {
      throw new Error(
        `You can’t perform a client side navigation to ${to.href} from ${from.href}`,
      );
    }

    return urlToPath(to);
  } else if (typeof to === 'object') {
    const {pathname, search, hash} = to;

    const finalPathname = pathname ?? from.pathname;
    const finalSearch = searchToString(search ?? from.search);
    const finalHash = hash ?? from.hash;

    return prefixPath(
      `${finalPathname}${finalSearch}${prefixIfNeeded('#', finalHash)}`,
      from.prefix,
    );
  }

  return to.indexOf('/') === 0
    ? prefixPath(to, from.prefix)
    : urlToPath(new URL(prefixPath(to, from.prefix), postfixSlash(from.href)));
}

function prefixPath(pathname: string, prefix?: string) {
  if (!prefix) return pathname;

  return pathname.indexOf('/') === 0
    ? `${postfixSlash(prefix)}${pathname.slice(1)}`
    : pathname;
}

function extractPrefix(url: URL, prefix?: Prefix) {
  if (!prefix) return undefined;

  if (typeof prefix === 'string') {
    return url.pathname.indexOf(prefix) === 0 ? prefix : undefined;
  }

  const regex = new RegExp(prefix.source);
  const match = regex.exec(url.pathname);
  return match != null && match.index === 0 ? match[0] : undefined;
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function createKey() {
  return `${String(Date.now())}${Math.random()}`;
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
  return value.length > 0 || value[0] === prefix ? value : `${prefix}${value}`;
}

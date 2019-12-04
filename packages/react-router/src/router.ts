import {ServerRenderEffectKind} from '@quilted/react-server-render';
import {EnhancedURL, Match} from './types';

export const SERVER_RENDER_EFFECT_ID = Symbol('router');

export interface State {
  switchFallbacks: string[];
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
export const LISTEN = Symbol('listen');
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
  private currentSwitchId = 0;
  private blockers = new Set<Blocker>();
  private listeners = new Set<Listener>();
  private forceNextNavigation = false;
  private keys: string[] = [];

  constructor(url: URL, {switchFallbacks = []}: Partial<State> = {}) {
    for (const switchToFallback of switchFallbacks) {
      this.switchFallbacks.add(switchToFallback);
    }

    const currentUrl = enhanceUrl(url, {});
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

    this.currentUrl = createUrl();

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

  // should make this a normal method
  [LISTEN](listener: Listener) {
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
    const newUrl = createUrl();
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

function createUrl(): EnhancedURL {
  return enhanceUrl(new URL(window.location.href), {...window.history.state});
}

function enhanceUrl(url: URL, state: object): EnhancedURL {
  Object.defineProperty(url, 'state', {
    value: state,
    writable: true,
  });

  return url as EnhancedURL;
}

function resolveUrl(to: NavigateTo, from: URL) {
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
    const finalPathname = pathname || from.pathname;
    const finalSearch = searchToString(search || from.search);
    const finalHash = hash || from.hash;

    return new URL(`${finalPathname}${finalSearch}${finalHash}`, from.href);
  }

  return new URL(to, postfixSlash(from.href));
}

function resolve(to: NavigateTo, from: URL) {
  if (to instanceof URL) {
    if (to.origin !== from.origin) {
      throw new Error(
        `You can’t perform a client side navigation to ${to.href} from ${from.href}`,
      );
    }

    return urlToPath(to);
  } else if (typeof to === 'object') {
    const {pathname, search, hash} = to;

    const finalPathname = pathname || from.pathname;
    const finalSearch = searchToString(search || from.search);
    const finalHash = hash || from.hash;

    return `${finalPathname}${finalSearch}${finalHash}`;
  }

  return to.indexOf('/') === 0
    ? to
    : urlToPath(new URL(to, postfixSlash(from.href)));
}

function postfixSlash(path: string) {
  return path.lastIndexOf('/') === path.length - 1 ? path : `${path}/`;
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
    return search;
  } else if (search instanceof URLSearchParams) {
    return search.toString();
  } else {
    return Object.keys(search).reduce<string>((searchString, key) => {
      return `${searchString}${key}=${encodeURIComponent(
        (search as any)[key],
      )}`;
    }, '?');
  }
}

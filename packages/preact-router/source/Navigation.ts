import {Signal, signal} from '@quilted/signals';
import {testMatch, resolveURL, type NavigateTo} from '@quilted/routing';
import {
  AsyncAction,
  AsyncActionCache,
  type AsyncActionCacheEntrySerialization,
} from '@quilted/async';

import type {
  NavigationRequest,
  RouteDefinition,
  RouteNavigationEntry,
} from './types.ts';

/**
 * The base path the router resolves routes and links against. A `string` or
 * `URL` pins it for the lifetime of the navigation. A function form is
 * re-evaluated from the current URL on every read, so the base can change in
 * place as the app navigates — useful for multi-tenant apps that swap a scope
 * prefix (e.g. `/@tenant`) without a full page reload.
 */
export type NavigationBase = string | URL | ((url: URL) => string | URL);

export interface NavigationOptions {
  cache?:
    | RouterNavigationCache
    | Iterable<AsyncActionCacheEntrySerialization<any>>
    | boolean;
  base?: NavigationBase;
  isExternal?(url: URL, currentUrl: URL): boolean;
  /**
   * Whether the router manages scroll position across navigations. When
   * enabled (the default in the browser), the router switches the browser to
   * manual scroll restoration and keeps its own per-entry scroll offsets,
   * keyed by navigation id and persisted to `sessionStorage`:
   *
   * - a forward navigation resets to the top (or scrolls to the URL hash
   *   target, if present);
   * - a back/forward navigation restores the offset the entry was last left
   *   at;
   * - a reload restores the offset of the entry it lands on.
   *
   * Pass `false` to leave scrolling entirely to the browser/your app.
   */
  scrollRestoration?: boolean;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: NavigationRequest['state'];
  base?: string | URL;
}

const STATE_ID_FIELD_KEY = '_id';

const SCROLL_POSITIONS_STORAGE_KEY = 'quilt:navigation:scroll-positions';

// Cap the persisted set so a long-lived tab session can't grow it without
// bound; the most-recent entries are the ones a user is likely to return to.
const MAX_STORED_SCROLL_POSITIONS = 50;

type ScrollPosition = readonly [x: number, y: number];

export class Navigation {
  get base(): string {
    const base = this.#base;
    if (typeof base === 'function') {
      const resolved = base(this.#currentRequest.peek().url);
      return typeof resolved === 'string' ? resolved : resolved.pathname;
    }
    return base;
  }

  readonly cache: RouterNavigationCache;

  get currentRequest() {
    return this.#currentRequest.value;
  }

  readonly #currentRequest: Signal<NavigationRequest>;

  // A resolved string base, or a function re-evaluated against the current URL
  // on every `base` read (see the `base` getter).
  #base: string | ((url: URL) => string | URL);

  // @ts-expect-error Will use this later
  #forceNextNavigation = false;
  #navigationIDs: string[] = [];
  #navigationRequests = new Map<string, NavigationRequest>();
  #isExternal: NavigationOptions['isExternal'];

  #scrollRestoration: boolean;
  #scrollPositions = new Map<string, ScrollPosition>();
  #scrollRestorationFrame: number | undefined;
  #scrollRecordFrame: number | undefined;

  constructor(
    initial?: string | URL | Partial<NavigationRequest>,
    {
      cache = true,
      base,
      isExternal,
      scrollRestoration = true,
    }: NavigationOptions = {},
  ) {
    // Establish the current request first: a function `base` resolves against
    // it, and the cache reads `base` lazily, so it must exist before either.
    const currentRequest = new BrowserNavigationRequest(initial);
    this.#currentRequest = signal(currentRequest);
    this.#navigationIDs.push(currentRequest.id);
    this.#navigationRequests.set(currentRequest.id, currentRequest);

    this.#base =
      typeof base === 'function'
        ? base
        : base
          ? typeof base === 'string'
            ? base
            : base.pathname
          : '/';
    this.cache =
      typeof cache === 'boolean'
        ? cache
          ? new RouterNavigationCache(this)
          : new RouterNavigationCache(this, {disabled: true})
        : cache instanceof RouterNavigationCache
          ? cache
          : new RouterNavigationCache(this, {entries: cache});
    this.#isExternal = isExternal;
    this.#scrollRestoration = scrollRestoration;

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.#handlePopstate);

      if (this.#scrollRestoration) {
        // Own scroll restoration outright: the browser's heuristic restores
        // against the document height at popstate time, which an async SPA
        // route hasn't rendered yet, landing at the wrong offset.
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'manual';
        }

        this.#scrollPositions = readStoredScrollPositions();
        window.addEventListener('scroll', this.#handleScroll, {passive: true});
        window.addEventListener('pagehide', this.#persistScrollPositions);

        // Restore the offset for the entry we loaded into. Covers a reload
        // partway down a page: the id survives in `history.state` and the
        // SSR'd markup is already at full height, so the offset is reachable.
        if (this.#scrollPositions.has(currentRequest.id)) {
          this.#restoreScrollPosition(currentRequest);
        }
      }
    }
  }

  navigate = (
    to: NavigateTo,
    {state = {}, replace = false, base}: NavigateOptions = {},
  ): NavigationRequest => {
    if (typeof history === 'undefined') {
      throw new Error('Cannot navigate in a non-browser environment');
    }

    const currentRequest = this.#currentRequest.peek();

    // Capture where we're leaving from before the URL changes, so a later
    // back/forward to this entry restores the offset the user left it at.
    if (this.#scrollRestoration) this.#recordScrollPosition(currentRequest.id);

    const id = createNavigationRequestID();
    const url = resolveURL(to, currentRequest.url, base ?? this.base);
    const finalState = {...state, [STATE_ID_FIELD_KEY]: id};

    const request: NavigationRequest = {id, url, state: finalState};

    // const redo = () => {
    //   this.#forceNextNavigation = true;
    //   this.navigate(url, {
    //     state,
    //     replace,
    //     // relativeTo,
    //   });
    // };

    // if (!this.#forceNextNavigation && shouldBlock(resolvedUrl, redo)) {
    //   return;
    // }

    this.#forceNextNavigation = false;

    const external =
      url.origin !== currentRequest.url.origin ||
      (this.#isExternal?.(url, currentRequest.url) ?? false);

    if (external) {
      window.location[replace ? 'replace' : 'assign'](url.href);
      return request;
    }

    const resolvedPath = urlToPath(url);

    try {
      history[replace ? 'replaceState' : 'pushState'](
        finalState,
        '',
        resolvedPath,
      );
    } catch (error) {
      window.location[replace ? 'replace' : 'assign'](resolvedPath);
      return request;
    }

    const navigationIDs = this.#navigationIDs;
    const entryIndex = navigationIDs.lastIndexOf(currentRequest.id);

    if (replace) {
      navigationIDs.splice(entryIndex, 1, id);
    } else {
      navigationIDs.splice(
        entryIndex + 1,
        navigationIDs.length - entryIndex - 1,
        id,
      );
    }

    this.#navigationRequests.set(id, request);
    this.#currentRequest.value = request;

    if (this.#scrollRestoration) {
      if (replace) {
        // A replace keeps the user in place, but it mints a fresh entry id;
        // carry the current offset onto it so a later return still restores.
        const previous = this.#scrollPositions.get(currentRequest.id);
        if (previous) this.#scrollPositions.set(id, previous);
      } else {
        this.#restoreScrollPosition(request);
      }

      this.#persistScrollPositions();
    }

    return request;
  };

  go(count: number) {
    if (typeof history === 'undefined') {
      throw new Error('Cannot navigate in a non-browser environment');
    }

    window.history.go(count);
  }

  back(count = -1) {
    this.go(count < 0 ? count : -count);
  }

  forward(count = 1) {
    this.go(count);
  }

  // block(blocker?: Blocker): () => void;

  resolve(
    to: NavigateTo,
    options?: {base?: string | URL},
  ): {readonly url: URL; readonly external: boolean} {
    const currentURL = this.#currentRequest.peek().url;
    const url = resolveURL(to, currentURL, options?.base ?? this.base);

    const external = this.#isExternal
      ? this.#isExternal(url, currentURL)
      : url.origin !== currentURL.origin;

    return {url, external};
  }

  #handlePopstate = () => {
    // The browser keeps the outgoing page's scroll offset until we re-render
    // (manual restoration), so record it against the entry we're leaving.
    if (this.#scrollRestoration) {
      this.#recordScrollPosition(this.#currentRequest.peek().id);
    }

    const navigationIDs = this.#navigationIDs;
    const fallbackNavigationID = navigationIDs[0]!;

    const url = getNavigationRequestURLFromEnvironment();
    const state = getNavigationRequestStateFromEnvironment();
    const id = (state[STATE_ID_FIELD_KEY] as string) ?? fallbackNavigationID;

    let request = this.#navigationRequests.get(id);

    if (request == null) {
      request = {url, state, id};
      this.#navigationRequests.set(id, request);
    }

    // const currentNavigationIndex = navigationIDs.lastIndexOf(
    //   window.history.state?.[STATE_ID_FIELD_KEY] ?? fallbackNavigationID,
    // );

    // const previousNavigationIndex = navigationIDs.lastIndexOf(
    //   this.#currentRequest.peek().id,
    // );
    // const delta = previousNavigationIndex - currentNavigationIndex;

    // const redo = () => {
    //   if (delta) {
    //     this.#forceNextNavigation = true;
    //     this.go(delta);
    //   }
    // };

    // if (!this.#forceNextNavigation && shouldBlock(newUrl, redo)) {
    //   this.#forceNextNavigation = true;
    //   this.go(-delta);
    //   return;
    // }

    // this.#forceNextNavigation = false;

    this.#currentRequest.value = request;

    if (this.#scrollRestoration) {
      this.#persistScrollPositions();
      this.#restoreScrollPosition(request);
    }
  };

  #handleScroll = () => {
    // Coalesce the high-frequency scroll event into a single write per frame.
    if (this.#scrollRecordFrame != null) return;
    this.#scrollRecordFrame = requestAnimationFrame(() => {
      this.#scrollRecordFrame = undefined;
      this.#recordScrollPosition();
    });
  };

  #recordScrollPosition(id = this.#currentRequest.peek().id) {
    this.#scrollPositions.set(id, [window.scrollX, window.scrollY]);
  }

  #restoreScrollPosition(request: NavigationRequest) {
    if (this.#scrollRestorationFrame != null) {
      cancelAnimationFrame(this.#scrollRestorationFrame);
      this.#scrollRestorationFrame = undefined;
    }

    const saved = this.#scrollPositions.get(request.id);
    const {hash} = request.url;

    // Fresh forward navigation with no hash target: reset to the top, and do
    // it synchronously so there's no flash of the new route rendered at the
    // previous page's offset before the frame callback fires.
    if (saved == null && hash.length <= 1) {
      window.scrollTo(0, 0);
      return;
    }

    // A saved offset (back/forward, reload) or a hash target both need the
    // destination route's content committed — and tall enough — before we can
    // scroll to it, so defer to the next frame.
    this.#scrollRestorationFrame = requestAnimationFrame(() => {
      this.#scrollRestorationFrame = undefined;

      if (saved != null) {
        window.scrollTo(saved[0], saved[1]);
        return;
      }

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    });
  }

  #persistScrollPositions = () => {
    try {
      const entries = [...this.#scrollPositions];
      const trimmed =
        entries.length > MAX_STORED_SCROLL_POSITIONS
          ? entries.slice(entries.length - MAX_STORED_SCROLL_POSITIONS)
          : entries;
      sessionStorage.setItem(
        SCROLL_POSITIONS_STORAGE_KEY,
        JSON.stringify(trimmed),
      );
    } catch {
      // `sessionStorage` can throw (privacy mode, sandboxed iframe, quota).
      // Scroll restoration is a progressive enhancement — swallow and move on.
    }
  };
}

export {Navigation as Router};

export class RouterNavigationCache {
  readonly disabled: boolean;
  // Hold the navigation rather than a snapshot string, so a reactive (function)
  // `base` is re-read on every match instead of frozen at construction.
  #navigation: Pick<Navigation, 'base'>;
  #loadCache: AsyncActionCache;
  #entryCache = new Map<string, RouteNavigationEntry<any, any, any>>();
  #matchCache = new Map<
    string,
    {
      routes: readonly RouteDefinition<any, any, any>[];
      // Mutable to match `routeStack` below; the matcher fills it by push.
      stack: RouteNavigationEntry<any, any, any>[];
    }
  >();

  constructor(
    navigation: Pick<Navigation, 'base'>,
    {
      entries,
      disabled = false,
    }: {
      entries?: Iterable<AsyncActionCacheEntrySerialization<any>>;
      disabled?: boolean;
    } = {},
  ) {
    this.disabled = disabled;
    this.#navigation = navigation;
    this.#loadCache = new AsyncActionCache(disabled ? undefined : entries);
  }

  match<Context = any>(
    request: NavigationRequest,
    routes: readonly NoInfer<RouteDefinition<any, any, Context>>[],
    {
      parent,
      context = parent?.context as any,
    }: {
      context?: Context;
      parent?: NoInfer<RouteNavigationEntry<any, any, any>>;
    } = {},
  ) {
    // TODO: handle multiple sibling `useRoutes()`
    let matchID = request.id;
    if (parent) matchID += `@${stringifyKey(parent.key)}`;

    if (!this.disabled) {
      const cached = this.#matchCache.get(matchID);
      // Only reuse a cached match when it came from the *same* route tree. The
      // active tree can be swapped in place for a given navigation (e.g. a
      // tenant/scope change that selects a different set of routes), and keying
      // solely by request id would otherwise pin the entry to the stale tree
      // and mis-match the URL against it.
      if (cached && cached.routes === routes) {
        return cached.stack;
      }
    }

    let routeStack: RouteNavigationEntry<any, any, any>[] = [];
    if (!this.disabled) {
      this.#matchCache.set(matchID, {routes, stack: routeStack});
    }

    const base = this.#navigation.base;
    const currentURL = request.url;
    const entryCache = this.#entryCache;
    const loadCache = this.#loadCache;

    const processRoutes = (
      routes: readonly RouteDefinition<any, any, Context>[],
      parent?: RouteNavigationEntry<any, any, Context>,
    ) => {
      for (const route of routes) {
        let match: ReturnType<typeof testMatch>;
        const exact = route.exact ?? route.children == null;

        if (Array.isArray(route.match)) {
          for (const routeMatch of route.match) {
            match = testMatch(
              currentURL,
              routeMatch,
              parent?.consumed,
              exact,
              base,
            );
            if (match != null) break;
          }
        } else {
          match = testMatch(
            currentURL,
            route.match,
            parent?.consumed,
            exact,
            base,
          );
        }

        if (match == null) continue;

        let key: unknown;

        if (route.key) {
          key =
            typeof route.key === 'function'
              ? route.key({
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  input: {},
                  data: {},
                } as any)
              : route.key;
        } else {
          const getMatched =
            typeof match.matched === 'string'
              ? match.matched
              : match.matched[0];

          key = match.consumed
            ? // Need an extra postfix `/` to differentiate an index route from its parent
              `${match.consumed}${getMatched === '' || getMatched === '/' ? '/' : ''}`
            : `/${stringifyRoute(route)}`;
        }

        const keyID = typeof key === 'string' ? key : JSON.stringify(key);
        const loadID = parent?.key ? `${parent.key}:${keyID}` : keyID;
        const id = `${matchID}:${loadID}`;

        let entry = this.disabled ? undefined : entryCache.get(id);
        if (entry == null) {
          const load = route.load
            ? loadCache.create(
                (cached) =>
                  new AsyncAction(() => route.load!(entry as any, context), {
                    cached,
                  }),
                {key: loadID},
              )
            : undefined;

          entry = (
            load
              ? {
                  id,
                  key,
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  load,
                  input: undefined,
                  get data() {
                    return load.data;
                  },
                }
              : {
                  id,
                  key,
                  request,
                  route,
                  parent,
                  context,
                  matched: match.matched,
                  consumed: match.consumed,
                  load,
                  input: undefined,
                  data: undefined,
                }
          ) as any;

          if (!this.disabled) {
            entryCache.set(id, entry!);
          }
        }

        if (route.load && route.input) {
          (entry as any).input = route.input(entry as any);
        }

        routeStack.push(entry!);

        if (route.children) {
          processRoutes(route.children, entry);
        }

        return entry!;
      }
    };

    processRoutes(routes, parent);

    return routeStack;
  }

  restore(entries: Iterable<AsyncActionCacheEntrySerialization<any>>) {
    if (this.disabled) return;
    this.#loadCache.restore(entries);
  }

  serialize() {
    if (this.disabled) return [];
    return this.#loadCache.serialize();
  }
}

function stringifyKey(key: unknown) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function stringifyRoute({match}: RouteDefinition<any, any, any>) {
  if (match == null || match === true || match === '*') {
    return '*';
  }

  if (typeof match === 'string') {
    return match[0] === '/' ? match.slice(1) : match;
  }

  if (match instanceof RegExp) {
    return match.toString();
  }
}

class BrowserNavigationRequest implements NavigationRequest {
  readonly id: string;
  readonly url: URL;
  readonly state: NavigationRequest['state'];

  constructor(
    request?: string | URL | Partial<NavigationRequest>,
    baseURL?: string | URL,
  ) {
    let id: string | undefined;
    let url: URL;
    let state: NavigationRequest['state'];

    if (
      request == null ||
      typeof request === 'string' ||
      request instanceof URL
    ) {
      url = getNavigationRequestURLFromEnvironment(request, baseURL);
      state = getNavigationRequestStateFromEnvironment();
    } else {
      url = getNavigationRequestURLFromEnvironment(request.url, baseURL);
      id = request.id;
      state = request.state ?? getNavigationRequestStateFromEnvironment();
    }

    this.id =
      id ??
      (state[STATE_ID_FIELD_KEY] as string) ??
      createNavigationRequestID();
    this.url = url;
    this.state = state;
  }
}

function getNavigationRequestURLFromEnvironment(
  to?: string | URL,
  baseURL?: string | URL,
) {
  const hasGlobalLocation = typeof location === 'object';

  const base = baseURL ?? (hasGlobalLocation ? location.href : undefined);

  try {
    return new URL(to ?? base!, base);
  } catch (error) {
    if (!hasGlobalLocation) {
      throw new Error(
        'Cannot create a navigation request without a URL in a non-browser environment',
        {cause: error},
      );
    }

    throw error;
  }
}

function getNavigationRequestStateFromEnvironment() {
  if (typeof history === 'undefined') {
    return {};
  }

  return history.state ?? {};
}

function createNavigationRequestID() {
  return `${String(Date.now())}${Math.random()}`;
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function readStoredScrollPositions(): Map<string, ScrollPosition> {
  try {
    const stored = sessionStorage.getItem(SCROLL_POSITIONS_STORAGE_KEY);
    if (!stored) return new Map();
    return new Map(JSON.parse(stored) as [string, ScrollPosition][]);
  } catch {
    return new Map();
  }
}

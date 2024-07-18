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

export interface RouterOptions {
  cache?: RouterNavigationCache | boolean;
  base?: string | URL;
  isExternal?(url: URL, currentUrl: URL): boolean;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: NavigationRequest['state'];
  base?: string | URL;
}

const STATE_ID_FIELD_KEY = '_id';

export class Router {
  readonly base: string;
  readonly cache?: RouterNavigationCache;

  get currentRequest() {
    return this.#currentRequest.value;
  }

  readonly #currentRequest: Signal<NavigationRequest>;

  // @ts-expect-error Will use this later
  #forceNextNavigation = false;
  #navigationIDs: string[] = [];
  #navigationRequests = new Map<string, NavigationRequest>();
  #isExternal: RouterOptions['isExternal'];

  constructor(
    initial?: string | URL | Partial<NavigationRequest>,
    {cache = true, base, isExternal}: RouterOptions = {},
  ) {
    this.base = base ? (typeof base === 'string' ? base : base.pathname) : '/';
    this.cache =
      typeof cache === 'boolean'
        ? cache
          ? new RouterNavigationCache(this)
          : undefined
        : cache;
    this.#isExternal = isExternal;

    const currentRequest = new BrowserNavigationRequest(initial);
    this.#currentRequest = signal(currentRequest);
    this.#navigationIDs.push(currentRequest.id);
    this.#navigationRequests.set(currentRequest.id, currentRequest);

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.#handlePopstate);
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
    options?: {baseURL?: string | URL},
  ): {readonly url: URL; readonly external: boolean} {
    const currentURL = this.#currentRequest.peek().url;
    const url = resolveURL(to, currentURL, options?.baseURL);

    const external = this.#isExternal
      ? this.#isExternal(url, currentURL)
      : url.origin !== currentURL.origin;

    return {url, external};
  }

  #handlePopstate = () => {
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
  };
}

export class RouterNavigationCache {
  #base: Router['base'];
  #entryCache = new Map<string, RouteNavigationEntry<any, any, any>>();
  #loadCache = new AsyncActionCache();
  #matchCache = new Map<
    string,
    readonly RouteNavigationEntry<any, any, any>[]
  >();

  constructor({base}: Pick<Router, 'base'>) {
    this.#base = base;
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

    let routeStack = this.#matchCache.get(matchID) as
      | RouteNavigationEntry<any, any, any>[]
      | undefined;
    if (routeStack) {
      return routeStack;
    }

    routeStack = [];
    this.#matchCache.set(matchID, routeStack);

    const base = this.#base;
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
        const loadID = parent?.consumed ? `${parent.consumed}:${keyID}` : keyID;
        const id = `${matchID}:${keyID}`;

        let entry = entryCache.get(id);
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

          entryCache.set(id, entry!);
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
    this.#loadCache.restore(entries);
  }

  serialize() {
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

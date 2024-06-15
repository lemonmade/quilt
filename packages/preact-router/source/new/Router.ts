import {Signal, signal} from '@quilted/signals';

import {resolveURL, type NavigateTo} from './routing.ts';

import type {NavigationRequest} from './types.ts';

export const SERVER_RENDER_EFFECT_ID = Symbol('router');

export interface RouterOptions {
  // state?: State;
  // prefix?: Prefix;
  // isExternal?(url: URL, currentUrl: URL): boolean;
}

export interface NavigateOptions {
  replace?: boolean;
  // relativeTo?: RelativeTo;
  state?: NavigationRequest['state'];
}

const STATE_ID_FIELD_KEY = '_id';

export class Router {
  get currentRequest() {
    return this.#currentRequest.value;
  }

  readonly #currentRequest: Signal<NavigationRequest>;
  // readonly prefix?: Prefix;

  #forceNextNavigation = false;
  #navigationIDs: string[] = [];
  #navigationRequests = new Map<string, NavigationRequest>();

  constructor(initial?: string | URL | Partial<NavigationRequest>) {
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
    {
      state = {},
      replace = false,
      // relativeTo
    }: NavigateOptions = {},
  ) => {
    if (typeof history === 'undefined') {
      throw new Error('Cannot navigate in a non-browser environment');
    }

    const id = createNavigationRequestID();
    const url = resolveURL(to, this.#currentRequest.peek().url);
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
    const entryIndex = navigationIDs.lastIndexOf(id);

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

  // block(blocker?: Blocker): () => void;
  // resolve(
  //   to: NavigateTo<EnhancedURL>,
  //   options?: {relativeTo?: RelativeTo},
  // ): {readonly url: URL; readonly external: boolean};
}

export class BrowserNavigationRequest implements NavigationRequest {
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

export function getNavigationRequestURLFromEnvironment(
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

export function getNavigationRequestStateFromEnvironment() {
  if (typeof history === 'undefined') {
    return {};
  }

  return history.state ?? {};
}

export function createNavigationRequestID() {
  return `${String(Date.now())}${Math.random()}`;
}

function urlToPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

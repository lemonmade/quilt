import {createHeaders, CookieString} from '@quilted/http';
import type {
  StatusCode,
  Cookies,
  CookieOptions,
  ReadonlyHeaders,
} from '@quilted/http';
import type {ServerActionKind} from '@quilted/react-server-render';

import {SERVER_ACTION_ID} from './constants';

interface Options {
  headers?: ReadonlyHeaders;
}

export interface ResponseCookieDefinition extends CookieOptions {
  name: string;
  value?: string;
}

export interface HttpState {
  readonly statusCode: number;
  readonly headers: Headers;
  readonly redirectUrl?: string;
}

export class HttpManager {
  readonly actionKind: ServerActionKind = {
    id: SERVER_ACTION_ID,
    afterEachPass: () => {
      return this.redirectUrl == null;
    },
    betweenEachPass: () => {
      this.reset();
    },
  };

  readonly headers: ReadonlyHeaders;
  readonly cookies: Cookies;
  readonly persistedHeaders = new Set<string>();
  readonly responseHeaders = createHeaders();

  private statusCodes: StatusCode[] = [];
  private redirectUrl?: string;

  constructor({headers}: Options = {}) {
    this.headers = headers ?? createHeaders();
    this.cookies = cookiesFromHeaders(this.headers, this.responseHeaders);
  }

  reset() {
    this.statusCodes = [];

    this.responseHeaders.forEach((header) => {
      this.responseHeaders.delete(header);
    });

    this.persistedHeaders.clear();

    this.redirectUrl = undefined;
  }

  persistHeader(header: string) {
    this.persistedHeaders.add(header.toLowerCase());
  }

  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
  redirectTo(url: string, statusCode: StatusCode = 308) {
    this.addStatusCode(statusCode);
    this.redirectUrl = url;
  }

  addStatusCode(statusCode: StatusCode) {
    this.statusCodes.push(statusCode);
  }

  get state(): HttpState {
    return {
      statusCode: Math.max(200, ...this.statusCodes),
      headers: this.responseHeaders,
      redirectUrl: this.redirectUrl,
    };
  }
}

function cookiesFromHeaders(
  requestHeaders: ReadonlyHeaders,
  responseHeaders: Headers,
): Cookies {
  const internalCookies = CookieString.parse(
    requestHeaders?.get('Cookie') ?? '',
  );

  const cookies: Cookies = {
    get: (key) => internalCookies[key],
    has: (key) => internalCookies[key] != null,
    set(cookie, value, options) {
      responseHeaders.append(
        'Set-Cookie',
        CookieString.serialize(cookie, value, options),
      );
    },
    delete(cookie, options) {
      cookies.set(cookie, '', {expires: new Date(0), ...options});
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    subscribe() {},
    *entries() {
      yield* Object.entries(internalCookies);
    },
    *[Symbol.iterator]() {
      yield* Object.values(internalCookies);
    },
  };

  return cookies;
}

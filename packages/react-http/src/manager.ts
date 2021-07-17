import * as CookieHeader from 'cookie';

import {
  createCookies,
  createHeaders,
  ExtendedWritableCookies,
} from '@quilted/http';
import type {
  StatusCode,
  ReadonlyCookies,
  ReadonlyHeaders,
  CookieOptions,
} from '@quilted/http';
import type {ServerActionKind} from '@quilted/react-server-render';

import {SERVER_ACTION_ID} from './constants';

interface Options {
  headers?: ReadonlyHeaders;
  cookies?: ReadonlyCookies;
}

export interface ResponseCookieDefinition extends CookieOptions {
  name: string;
  value?: string;
}

export interface HttpState {
  readonly statusCode: number;
  readonly headers: Headers;
  readonly cookies: ExtendedWritableCookies;
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
  readonly cookies: ReadonlyCookies;
  readonly persistedHeaders = new Set<string>();
  readonly responseHeaders = createHeaders();
  readonly responseCookies = createCookies();

  private statusCodes: StatusCode[] = [];
  private redirectUrl?: string;

  constructor({headers, cookies}: Options = {}) {
    this.headers = headers ?? createHeaders();
    this.cookies = cookies ?? cookiesFromCookieHeader(headers?.get('Cookie'));
  }

  reset() {
    this.statusCodes = [];

    (this as any).responseHeaders = createHeaders();
    (this as any).responseCookies = createCookies();

    this.redirectUrl = undefined;
  }

  persistHeader(header: string) {
    this.persistedHeaders.add(header.toLowerCase());
  }

  redirectTo(url: string, statusCode: StatusCode = 302) {
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
      cookies: this.responseCookies,
      redirectUrl: this.redirectUrl,
    };
  }
}

function cookiesFromCookieHeader(
  header?: string | null,
): NonNullable<Options['cookies']> {
  const cookies = CookieHeader.parse(header ?? '');

  return {
    get: (key) => cookies[key],
    has: (key) => cookies[key] != null,
    *entries() {
      yield* Object.entries(cookies);
    },
    *[Symbol.iterator]() {
      yield* Object.keys(cookies);
    },
  };
}

import {resolveSignalOrValue, type ReadonlySignal} from '@quilted/signals';

import type {BrowserDetails, CookieOptions, Cookies} from './types.ts';

export * from './types.ts';

export class BrowserResponse implements BrowserDetails {
  readonly title = new BrowserResponseTitle();
  readonly meta = new BrowserResponseHeadElements('meta');
  readonly link = new BrowserResponseHeadElements('link');
  readonly status = new BrowserResponseStatus();
  readonly cookies: BrowserResponseCookies;
  readonly serializations: BrowserResponseSerializations;
  readonly headers: Headers;
  readonly initialURL: URL;

  constructor({
    request,
    headers = new Headers(),
    serializations,
  }: {
    request: Request;
    headers?: Headers;
    serializations?: Iterable<[string, unknown]>;
  }) {
    this.initialURL = new URL(request.url);
    this.headers = headers;
    this.cookies = new BrowserResponseCookies(
      headers,
      request.headers.get('Cookie') ?? undefined,
    );
    this.serializations = new BrowserResponseSerializations(
      new Map(serializations),
    );
  }
}

export class BrowserResponseCookies implements Cookies {
  private readonly cookies: Record<string, string>;

  constructor(
    private readonly headers: Headers,
    cookie?: string,
  ) {
    this.cookies = CookieString.parse(cookie ?? '');
  }

  has(cookie: string) {
    return this.cookies[cookie] != null;
  }

  get(cookie: string) {
    return this.cookies[cookie];
  }

  set(cookie: string, value: string, options?: CookieOptions) {
    this.headers.append(
      'Set-Cookie',
      CookieString.serialize(cookie, value, options),
    );
  }

  delete(cookie: string, options?: CookieOptions) {
    this.set(cookie, '', {expires: new Date(0), ...options});
  }

  *entries() {
    yield* Object.entries(this.cookies);
  }

  *[Symbol.iterator]() {
    yield* Object.keys(this.cookies);
  }
}

export class BrowserResponseStatus {
  private statusCode?: number;

  get value() {
    return this.statusCode ?? 200;
  }

  set(value: number) {
    this.statusCode = Math.max(value, this.statusCode ?? 0);
  }
}

export class BrowserResponseTitle {
  private lastTitle?: string | ReadonlySignal<string>;

  get value() {
    return resolveSignalOrValue(this.lastTitle);
  }

  add = (title: string | ReadonlySignal<string>) => {
    this.lastTitle = title;
    return () => {};
  };
}

export class BrowserResponseHeadElements<
  Element extends keyof HTMLElementTagNameMap,
> {
  private readonly elements: (
    | HTMLElementTagNameMap[Element]
    | ReadonlySignal<HTMLElementTagNameMap[Element]>
  )[] = [];

  get value() {
    return this.elements.map(resolveSignalOrValue);
  }

  constructor(readonly selector: Element) {}

  add = (
    attributes:
      | HTMLElementTagNameMap[Element]
      | ReadonlySignal<HTMLElementTagNameMap[Element]>,
  ) => {
    this.elements.push(attributes);
    return () => {};
  };
}

export class BrowserResponseSerializations {
  constructor(private readonly serializations = new Map<string, unknown>()) {}

  get(id: string) {
    return this.serializations.get(id) as any;
  }

  set(id: string, data: unknown) {
    if (data === undefined) {
      this.serializations.delete(id);
    } else {
      this.serializations.set(id, data);
    }
  }
}

// What follows is a basic re-implementation of https://www.npmjs.com/package/cookie.
// That library only uses CommonJS, which makes for some awkward build issues.

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

const FIELD_CONTENT_REG_EXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

const CookieString = {
  parse(str: string) {
    const cookies: Record<string, string> = {};
    const pairs = str.split(';');

    for (const pair of pairs) {
      const index = pair.indexOf('=');

      // skip things that don't look like key=value
      if (index < 0) continue;

      const key = pair.substring(0, index).trim();

      // only assign once
      if (cookies[key] == null) {
        let value = pair.substring(index + 1, pair.length).trim();

        // quoted values
        if (value[0] === '"') {
          value = value.slice(1, -1);
        }

        cookies[key] = tryDecode(value);
      }
    }

    return cookies;
  },
  serialize(name: string, rawValue: string, options: CookieOptions = {}) {
    if (!FIELD_CONTENT_REG_EXP.test(name)) {
      throw new TypeError('argument name is invalid');
    }

    const value = encodeURIComponent(rawValue);

    if (value && !FIELD_CONTENT_REG_EXP.test(value)) {
      throw new TypeError('argument val is invalid');
    }

    let cookie = name + '=' + value;

    if (options.maxAge != null) {
      const maxAge = options.maxAge;

      if (isNaN(maxAge) || !isFinite(maxAge)) {
        throw new TypeError('option maxAge is invalid');
      }

      cookie += '; Max-Age=' + Math.floor(maxAge);
    }

    if (options.domain) {
      if (!FIELD_CONTENT_REG_EXP.test(options.domain)) {
        throw new TypeError('option domain is invalid');
      }

      cookie += '; Domain=' + options.domain;
    }

    if (options.path) {
      if (!FIELD_CONTENT_REG_EXP.test(options.path)) {
        throw new TypeError('option path is invalid');
      }

      cookie += '; Path=' + options.path;
    }

    if (options.expires) {
      cookie += '; Expires=' + options.expires.toUTCString();
    }

    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (options.secure) {
      cookie += '; Secure';
    }

    if (options.sameSite) {
      const sameSite =
        typeof options.sameSite === 'string'
          ? options.sameSite.toLowerCase()
          : options.sameSite;

      switch (sameSite) {
        case 'lax':
          cookie += '; SameSite=Lax';
          break;
        case 'strict':
          cookie += '; SameSite=Strict';
          break;
        case 'none':
          cookie += '; SameSite=None';
          break;
        default:
          throw new TypeError('option sameSite is invalid');
      }
    }

    return cookie;
  },
};

function tryDecode(str: string) {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

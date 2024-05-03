import {resolveSignalOrValue, type ReadonlySignal} from '@quilted/signals';

import type {
  BrowserDetails,
  BrowserBodyAttributes,
  BrowserHTMLAttributes,
  CookieOptions,
  Cookies,
} from './types.ts';

import {CookieString} from './shared/cookies.ts';

export * from './types.ts';

export class BrowserTestMock implements BrowserDetails {
  readonly title = new BrowserTestMockTitle();
  readonly metas = new BrowserTestMockHeadElements('meta');
  readonly links = new BrowserTestMockHeadElements('link');
  readonly bodyAttributes =
    new BrowserTestMockElementAttributes<BrowserBodyAttributes>();
  readonly htmlAttributes =
    new BrowserTestMockElementAttributes<BrowserHTMLAttributes>();
  readonly cookies: BrowserTestMockCookies;
  readonly serializations: BrowserTestMockSerializations;
  readonly request: Request;

  constructor({
    url,
    cookies,
    serializations,
  }: {
    url?: URL | string;
    cookies?: ConstructorParameters<typeof BrowserTestMockCookies>[0];
    serializations?: ConstructorParameters<
      typeof BrowserTestMockSerializations
    >[0];
  }) {
    this.request = new Request(
      url ??
        (typeof location === 'object' ? location.href : 'https://example.com'),
    );
    this.cookies = new BrowserTestMockCookies(cookies);
    this.serializations = new BrowserTestMockSerializations(serializations);
  }
}

export class BrowserTestMockCookies implements Cookies {
  readonly updates: ({cookie: string; value: string} & CookieOptions)[] = [];
  private readonly cookies: Map<string, string>;

  constructor(
    cookie:
      | string
      | Record<string, string>
      | Iterable<readonly [string, string]> = [],
  ) {
    const cookieObject =
      typeof cookie === 'string' ? CookieString.parse(cookie) : cookie;

    this.cookies = new Map(
      Symbol.iterator in cookieObject
        ? cookieObject
        : Object.entries(cookieObject),
    );
  }

  has(cookie: string) {
    return this.cookies.has(cookie);
  }

  get(cookie: string) {
    return this.cookies.get(cookie);
  }

  set(cookie: string, value: string, options?: CookieOptions) {
    this.cookies.set(cookie, value);
    this.updates.push({cookie, value, ...options});
  }

  delete(cookie: string, options?: CookieOptions) {
    this.cookies.delete(cookie);
    this.updates.push({cookie, value: '', expires: new Date(0), ...options});
  }

  *entries() {
    yield* Object.entries(this.cookies);
  }

  *[Symbol.iterator]() {
    yield* Object.keys(this.cookies);
  }
}

export class BrowserTestMockTitle {
  private titleValues: (string | ReadonlySignal<string>)[] = [];

  get value() {
    return resolveSignalOrValue(this.titleValues.at(-1));
  }

  add = (title: string | ReadonlySignal<string>) => {
    this.titleValues.push(title);

    return () => {
      const index = this.titleValues.indexOf(title);
      if (index >= 0) this.titleValues.splice(index, 1);
    };
  };
}

export class BrowserTestMockHeadElements<
  Element extends keyof HTMLElementTagNameMap,
> {
  private readonly elements: (
    | Partial<HTMLElementTagNameMap[Element]>
    | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>
  )[] = [];

  get value() {
    return this.elements.map(resolveSignalOrValue);
  }

  constructor(readonly selector: Element) {}

  add = (
    attributes:
      | Partial<HTMLElementTagNameMap[Element]>
      | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>,
  ) => {
    this.elements.push(attributes);

    return () => {
      const index = this.elements.indexOf(attributes);
      if (index >= 0) this.elements.splice(index, 1);
    };
  };
}

export class BrowserTestMockElementAttributes<Attributes> {
  private readonly attributes: (Attributes | ReadonlySignal<Attributes>)[] = [];

  get value() {
    return Object.assign({}, this.attributes.map(resolveSignalOrValue));
  }

  add = (attributes: Attributes | ReadonlySignal<Attributes>) => {
    this.attributes.push(attributes);

    return () => {
      const index = this.attributes.indexOf(attributes);
      if (index >= 0) this.attributes.splice(index, 1);
    };
  };
}

export class BrowserTestMockSerializations {
  private readonly serializations: Map<string, unknown>;

  constructor(
    serializations:
      | Record<string, unknown>
      | Iterable<readonly [string, unknown]> = [],
  ) {
    this.serializations = new Map(
      Symbol.iterator in serializations
        ? serializations
        : Object.entries(serializations),
    );
  }

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

  *[Symbol.iterator]() {
    yield* this.serializations;
  }
}

import {resolveSignalOrValue, type ReadonlySignal} from '@quilted/signals';
import type {
  AssetLoadTiming,
  BrowserAssetModuleSelector,
} from '@quilted/assets';

import type {
  BrowserDetails,
  BrowserBodyAttributes,
  BrowserHTMLAttributes,
  CookieOptions,
  Cookies,
} from './types.ts';
import {encode} from './encoding.ts';

import {CookieString} from './shared/cookies.ts';
export {ResponseCookies} from './server/cookies.ts';

export * from './types.ts';
export * from './headers.ts';

export class BrowserResponse implements BrowserDetails {
  readonly title = new BrowserResponseTitle();
  readonly metas = new BrowserResponseMetaElements();
  readonly links = new BrowserResponseHeadElements('link');
  readonly bodyAttributes =
    new BrowserResponseElementAttributes<BrowserBodyAttributes>();
  readonly htmlAttributes =
    new BrowserResponseElementAttributes<BrowserHTMLAttributes>();
  readonly status: BrowserResponseStatus;
  readonly cookies: BrowserResponseCookies;
  readonly locale: BrowserDetails['locale'];
  readonly serializations: BrowserResponseSerializations;
  readonly headers: Headers;
  readonly request: Request;
  readonly assets: BrowserResponseAssets;

  constructor({
    request,
    status,
    headers = new Headers(),
    locale = getLocaleFromRequest(request) ?? 'en',
    serializations,
  }: {
    request: Request;
    status?: number;
    headers?: Headers;
    locale?: string;
    serializations?: Iterable<[string, unknown]>;
  }) {
    this.request = request;
    this.status = new BrowserResponseStatus(status);
    this.headers = headers;
    this.cookies = new BrowserResponseCookies(
      headers,
      request.headers.get('Cookie') ?? undefined,
    );
    this.assets = new BrowserResponseAssets();
    this.locale = {value: locale};
    this.serializations = new BrowserResponseSerializations(
      new Map(serializations),
    );
  }
}

export class BrowserResponseCookies implements Cookies {
  readonly #cookies: Record<string, string>;

  constructor(
    private readonly headers: Headers,
    cookie?: string,
  ) {
    this.#cookies = CookieString.parse(cookie ?? '');
  }

  has(cookie: string) {
    return this.#cookies[cookie] != null;
  }

  get(cookie: string) {
    return this.#cookies[cookie];
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
    yield* Object.entries(this.#cookies);
  }

  *[Symbol.iterator]() {
    yield* Object.keys(this.#cookies);
  }
}

export class BrowserResponseStatus {
  #statusCode?: number;

  constructor(statusCode?: number) {
    this.#statusCode = statusCode;
  }

  get value() {
    return this.#statusCode ?? 200;
  }

  set(value: number) {
    this.#statusCode = Math.max(value, this.#statusCode ?? 0);
  }
}

export class BrowserResponseTitle {
  #lastTitle?: string | ReadonlySignal<string>;

  get value() {
    return resolveSignalOrValue(this.#lastTitle);
  }

  add = (title: string | ReadonlySignal<string>) => {
    this.#lastTitle = title;
    return () => {};
  };
}

export class BrowserResponseHeadElements<
  Element extends keyof HTMLElementTagNameMap,
> {
  readonly #elements: (
    | Partial<HTMLElementTagNameMap[Element]>
    | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>
  )[] = [];

  get value() {
    return this.#elements.map((element) =>
      resolveSignalOrValue<Partial<HTMLElementTagNameMap[Element]>>(element),
    );
  }

  constructor(readonly selector: Element) {}

  add = (
    attributes:
      | Partial<HTMLElementTagNameMap[Element]>
      | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>,
  ) => {
    this.#elements.push(attributes);
    return () => {};
  };
}

/**
 * Manages meta elements for server-side rendering, extending the base functionality
 * of BrowserResponseHeadElements.
 *
 * This class provides special handling for meta elements to ensure that:
 * 1. Meta tags with unique name are preserved.
 * 2. When multiple meta tags have the same name, only the last one added is kept.
 *
 * This behavior is particularly useful for managing SEO-related meta tags, where
 * having duplicate name could be problematic or where later additions should
 * override earlier ones.
 */
export class BrowserResponseMetaElements extends BrowserResponseHeadElements<'meta'> {
  get value() {
    const baseValue = super.value;
    const resolvedValue: typeof baseValue = [];
    const nameIndexes = new Map<string, number>();

    for (const element of baseValue) {
      if (element.name == null) {
        resolvedValue.push(element);
        continue;
      }

      const existingIndex = nameIndexes.get(element.name);

      if (existingIndex == null) {
        nameIndexes.set(element.name, resolvedValue.length);
        resolvedValue.push(element);
      } else {
        resolvedValue[existingIndex] = element;
      }
    }

    return resolvedValue;
  }

  constructor() {
    super('meta');
  }
}

export class BrowserResponseElementAttributes<Attributes> {
  readonly #attributes: (Attributes | ReadonlySignal<Attributes>)[] = [];

  get value() {
    return Object.assign(
      {},
      ...this.#attributes.map((attribute) => resolveSignalOrValue(attribute)),
    );
  }

  add = (attributes: Attributes | ReadonlySignal<Attributes>) => {
    this.#attributes.push(attributes);
    return () => {};
  };
}

export class BrowserResponseSerializations {
  readonly #serializations = new Map<string, unknown>();

  get value() {
    return [...this.#serializations].map(([name, content]) => ({
      name,
      content: encode(typeof content === 'function' ? content() : content),
    }));
  }

  constructor(
    serializations: Record<string, unknown> | Iterable<[string, unknown]> = [],
  ) {
    if (typeof (serializations as any)[Symbol.iterator] === 'function') {
      for (const [key, value] of serializations as Iterable<
        [string, unknown]
      >) {
        this.set(key, value);
      }
    } else {
      for (const key in serializations) {
        this.set(key, (serializations as Record<string, unknown>)[key]);
      }
    }
  }

  get(id: string) {
    return this.#serializations.get(id) as any;
  }

  set(name: string, content: unknown) {
    if (content === undefined) {
      this.#serializations.delete(name);
    } else {
      this.#serializations.set(name, content);
    }
  }

  *[Symbol.iterator]() {
    yield* this.#serializations;
  }
}

function getLocaleFromRequest(request: Request) {
  const header = request.headers.get('Accept-Language');
  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
  const parsed = header?.split(',')[0]!.split(';')[0]!.trim();
  return parsed === '*' ? undefined : parsed;
}

const ASSET_TIMING_PRIORITY: AssetLoadTiming[] = ['never', 'preload', 'load'];

const PRIORITY_BY_TIMING = new Map(
  ASSET_TIMING_PRIORITY.map((value, index) => [value, index]),
);

export class BrowserResponseAssets {
  readonly #usedModulesWithTiming = new Map<
    string,
    {
      styles: AssetLoadTiming;
      scripts: AssetLoadTiming;
    }
  >();

  use(
    id: string,
    {
      timing = 'load',
      scripts = timing,
      styles = timing,
    }: {
      timing?: AssetLoadTiming;
      scripts?: AssetLoadTiming;
      styles?: AssetLoadTiming;
    } = {},
  ) {
    const current = this.#usedModulesWithTiming.get(id);

    if (current == null) {
      this.#usedModulesWithTiming.set(id, {
        scripts,
        styles,
      });
    } else {
      this.#usedModulesWithTiming.set(id, {
        scripts:
          scripts == null
            ? current.scripts
            : highestPriorityAssetLoadTiming(scripts, current.scripts),
        styles:
          styles == null
            ? current.styles
            : highestPriorityAssetLoadTiming(styles, current.styles),
      });
    }
  }

  get({timing = 'load'}: {timing?: AssetLoadTiming | AssetLoadTiming[]} = {}) {
    const allowedTiming = Array.isArray(timing) ? timing : [timing];

    const assets: BrowserAssetModuleSelector[] = [];

    for (const [asset, {scripts, styles}] of this.#usedModulesWithTiming) {
      const stylesMatch = allowedTiming.includes(styles);
      const scriptsMatch = allowedTiming.includes(scripts);

      if (stylesMatch || scriptsMatch) {
        assets.push({id: asset, styles: stylesMatch, scripts: scriptsMatch});
      }
    }

    return assets;
  }
}

function highestPriorityAssetLoadTiming(...timings: AssetLoadTiming[]) {
  return ASSET_TIMING_PRIORITY[
    Math.max(...timings.map((timing) => PRIORITY_BY_TIMING.get(timing)!))
  ]!;
}

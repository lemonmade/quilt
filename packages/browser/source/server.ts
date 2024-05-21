import {resolveSignalOrValue, type ReadonlySignal} from '@quilted/signals';

import type {
  BrowserDetails,
  BrowserBodyAttributes,
  BrowserHTMLAttributes,
  CookieOptions,
  Cookies,
} from './types.ts';
import type {
  AssetLoadTiming,
  AssetsCacheKey,
  BrowserAssetModuleSelector,
} from '@quilted/assets';

import {CookieString} from './shared/cookies.ts';

export * from './types.ts';

export class BrowserResponse implements BrowserDetails {
  readonly title = new BrowserResponseTitle();
  readonly metas = new BrowserResponseHeadElements('meta');
  readonly links = new BrowserResponseHeadElements('link');
  readonly bodyAttributes =
    new BrowserResponseElementAttributes<BrowserBodyAttributes>();
  readonly htmlAttributes =
    new BrowserResponseElementAttributes<BrowserHTMLAttributes>();
  readonly status: BrowserResponseStatus;
  readonly cookies: BrowserResponseCookies;
  readonly serializations: BrowserResponseSerializations;
  readonly headers: Headers;
  readonly request: Request;
  readonly assets: BrowserResponseAssets;

  constructor({
    request,
    status,
    headers = new Headers(),
    cacheKey,
    serializations,
  }: {
    request: Request;
    status?: number;
    headers?: Headers;
    cacheKey?: Partial<AssetsCacheKey>;
    serializations?: Iterable<[string, unknown]>;
  }) {
    this.request = request;
    this.status = new BrowserResponseStatus(status);
    this.headers = headers;
    this.cookies = new BrowserResponseCookies(
      headers,
      request.headers.get('Cookie') ?? undefined,
    );
    this.assets = new BrowserResponseAssets({cacheKey});
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
  constructor(private statusCode?: number) {}

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
    | Partial<HTMLElementTagNameMap[Element]>
    | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>
  )[] = [];

  get value() {
    return this.elements.map((element) =>
      resolveSignalOrValue<Partial<HTMLElementTagNameMap[Element]>>(element),
    );
  }

  constructor(readonly selector: Element) {}

  add = (
    attributes:
      | Partial<HTMLElementTagNameMap[Element]>
      | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>,
  ) => {
    this.elements.push(attributes);
    return () => {};
  };
}

export class BrowserResponseElementAttributes<Attributes> {
  private readonly attributes: (Attributes | ReadonlySignal<Attributes>)[] = [];

  get value() {
    return Object.assign(
      {},
      ...this.attributes.map((attribute) => resolveSignalOrValue(attribute)),
    );
  }

  add = (attributes: Attributes | ReadonlySignal<Attributes>) => {
    this.attributes.push(attributes);
    return () => {};
  };
}

export class BrowserResponseSerializations {
  get value() {
    return [...this.serializations].map(([id, value]) => ({
      id,
      value: (typeof value === 'function' ? value() : value) as unknown,
    }));
  }

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

  *[Symbol.iterator]() {
    yield* this.serializations;
  }
}

const ASSET_TIMING_PRIORITY: AssetLoadTiming[] = ['never', 'preload', 'load'];

const PRIORITY_BY_TIMING = new Map(
  ASSET_TIMING_PRIORITY.map((value, index) => [value, index]),
);

export class BrowserResponseAssets {
  readonly cacheKey: Partial<AssetsCacheKey>;
  private usedModulesWithTiming = new Map<
    string,
    {
      styles: AssetLoadTiming;
      scripts: AssetLoadTiming;
    }
  >();

  constructor({cacheKey}: {cacheKey?: Partial<AssetsCacheKey>} = {}) {
    this.cacheKey = {...cacheKey};
  }

  updateCacheKey(cacheKey: Partial<AssetsCacheKey>) {
    Object.assign(this.cacheKey, cacheKey);
  }

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
    const current = this.usedModulesWithTiming.get(id);

    if (current == null) {
      this.usedModulesWithTiming.set(id, {
        scripts,
        styles,
      });
    } else {
      this.usedModulesWithTiming.set(id, {
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

    for (const [asset, {scripts, styles}] of this.usedModulesWithTiming) {
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

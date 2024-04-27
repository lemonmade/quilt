/// <reference types="web" />

declare const __QUILT_ASSETS_BASE_URL__: string | undefined;

export interface AsyncModulesOptions {
  cache?: Iterable<[string, any]>;
  baseURL?: string;
}

export class AsyncModulesGlobal {
  /**
   * The content to prepend to assets that are preloaded. If you are using
   * quilt to build your application, this will automatically be set to the
   * `assets.baseURL` value passed in your configuration. For other setups,
   * you can use `globalThis[Symbol.for('quilt')].asyncModules.configure()`
   * to update this value for all new assets being loaded. If no value is
   * provided, this defaults to `/assets/`, which requires that your application
   * serve its assets from the `/assets` path on the same domain as your website.
   */
  get baseURL() {
    return this._options.baseURL;
  }

  private _options: {baseURL: string};
  private _cache: Map<string, unknown>;
  private _seen = new Set<string>();
  private _linkRel =
    typeof document !== 'undefined' &&
    document.createElement('link').relList?.supports?.('modulepreload')
      ? 'modulepreload'
      : 'preload';

  constructor({
    cache,
    baseURL = typeof __QUILT_ASSETS_BASE_URL__ === 'string'
      ? __QUILT_ASSETS_BASE_URL__
      : '/assets/',
  }: AsyncModulesOptions = {}) {
    this._options = {baseURL};
    this._cache = new Map<string, unknown>(cache);
  }

  /**
   * Loads a module that has been cached with `AsyncModulesGlobal.set()`. If no
   * module with the provided identifier has been saved, this function returns
   * `undefined`.
   */
  get<T = unknown>(id: string): T | undefined {
    return this._cache.get(id) as T;
  }

  /**
   * Allows you to cache a module by a unique identifier in order to be able
   * to retrieve it synchronously later using `AsyncModulesGlobal.get(id)`.
   */
  set<T = unknown>(id: string, module: T) {
    this._cache.set(id, module);
  }

  /**
   * Attempt to load the assets passed to this function. Assets will be loaded
   * relative to `baseUrl`.
   */
  async preload(...assets: string[]) {
    const {
      _seen: seenAssets,
      _linkRel: linkRel,
      _options: {baseURL},
    } = this;

    await Promise.all(
      assets.map(async (assetPath) => {
        const asset = `${baseURL}${assetPath}`;

        if (seenAssets.has(asset)) return;

        seenAssets.add(asset);
        const isCss = asset.endsWith('.css');

        const normalizedSource = asset.startsWith(location.origin)
          ? asset.slice(location.origin.length)
          : asset;

        // If we’ve already appended the link in server markup, no need to do it
        // again.
        if (
          document.querySelector(
            `link[href=${JSON.stringify(normalizedSource)}]`,
          )
        ) {
          return;
        }

        const link = document.createElement('link');
        link.rel = asset.endsWith('.css') ? 'stylesheet' : linkRel;

        if (!isCss) {
          link.as = 'script';

          if (normalizedSource.startsWith('/')) {
            link.crossOrigin = '';
          }
        }

        link.href = normalizedSource;
        document.head.appendChild(link);

        if (isCss) {
          await new Promise((res, rej) => {
            link.addEventListener('load', res);
            link.addEventListener('error', rej);
          });
        }
      }),
    );
  }

  /**
   * Customizes the behavior of async asset handling. Currently, you only change
   * the `baseUrl` that assets will be resolved relative to.
   *
   * ```ts
   * globalThis[Symbol.for('quilt')].asyncModules.configure({
   *   baseUrl: 'https://my-cdn.com/assets/',
   * });
   * ```
   */
  configure(newOptions: Omit<AsyncModulesOptions, 'cache'>) {
    this._options = {...this._options, ...newOptions};
  }

  /**
   * Iterates over each of the modules that have been cached.
   */
  [Symbol.iterator]<T = unknown>(): IterableIterator<[string, T]> {
    return this._cache[Symbol.iterator]() as any;
  }
}

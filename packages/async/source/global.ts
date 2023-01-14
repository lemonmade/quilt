/// <reference types="web" />

declare const __QUILT_ASSETS_BASE_URL__: string | undefined;

export interface AsyncAssetsOptions {
  baseUrl?: string;
}

export interface AsyncAssetsGlobal {
  /**
   * The content to prepend to assets that are preloaded. If you are using
   * quilt to build your application, this will automatically be set to the
   * `assets.baseUrl` value passed in your configuration. For other setups,
   * you can use `Quilt.AsyncAssets.configure()` to update this value for
   * all new assets being loaded. If no value is provided, this defaults
   * to `/assets/`, which requires that your application serve its assets
   * from the `/assets` path on the same domain as your website.
   */
  readonly baseUrl: string;
  /**
   * Allows you to cache a module by a unique identifier in order to be able
   * to retrieve it synchronously later using `Quilt.AsyncAssets.get(id)`.
   */
  set<T = unknown>(id: string, module: T): void;
  /**
   * Loads a module that has been cached with `Quilt.AsyncAssets.set()`. If no
   * module with the provided identifier has been saved, this function returns
   * `undefined`.
   */
  get<T = unknown>(id: string): T | undefined;
  /**
   * Attempt to load the assets passed to this function. Assets will be loaded
   * relative to `baseUrl`.
   */
  preload(...assets: string[]): Promise<void>;
  /**
   * Customizes the behavior of async asset handling. Currently, you only change
   * the `baseUrl` that assets will be resolved relative to.
   *
   * ```ts
   * Quilt.AsyncAssets.configure({
   *   baseUrl: 'https://my-cdn.com/assets/',
   * });
   * ```
   */
  configure(options: AsyncAssetsOptions): void;
}

export function installAsyncAssetsGlobal({
  baseUrl = typeof __QUILT_ASSETS_BASE_URL__ === 'string'
    ? __QUILT_ASSETS_BASE_URL__
    : '/assets/',
}: AsyncAssetsOptions = {}) {
  const asyncCacheInternal = new Map<string, unknown>();
  const seenAssets = new Set<string>();
  const linkRel =
    typeof document !== 'undefined' &&
    document.createElement('link').relList?.supports?.('modulepreload')
      ? 'modulepreload'
      : 'preload';

  const AsyncAssets: AsyncAssetsGlobal = {
    get baseUrl() {
      return baseUrl;
    },
    get<T = unknown>(id: string) {
      return asyncCacheInternal.get(id) as T;
    },
    set(id, module) {
      asyncCacheInternal.set(id, module);
    },
    async preload(...assets) {
      await Promise.all(
        assets.map(async (assetPath) => {
          const asset = `${baseUrl}${assetPath}`;

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
    },
    configure({baseUrl: newBaseUrl}) {
      if (newBaseUrl) {
        baseUrl = newBaseUrl.endsWith('/') ? newBaseUrl : `${newBaseUrl}/`;
      }
    },
  };

  Reflect.defineProperty(globalThis, 'Quilt', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: {
      AsyncAssets,
    },
  });
}

import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Options for controlling the Cache-Control header of the current
 * response.
 *
 * @see https://csswizardry.com/2019/03/cache-control-for-civilians/
 */
export type CacheControlOptions =
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: true;
      /**
       * Completely disable caching of this response. Passing this option
       * sets the `Cache-Control` header to `no-store`.
       */
      cache: false;
      maxAge?: never;
      immutable?: never;
      revalidate?: never;
    }
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: true;
      cache?: never;
      /**
       * The number of seconds, from the time of this request, that
       * the content is considered “fresh”.
       */
      maxAge?: number;
      immutable?: never;
      /**
       * Controls how clients should revalidate their cached content.
       * If this option is set to `true`, the resulting `Cache-Control`
       * header will have the `must-revalidate` directive, which asks
       * clients to revalidate their content after the `maxAge` period
       * has expired.
       *
       * If you instead pass `{allowStale: number}`, the resulting
       * `Cache-Control` header will have the `stale-while-revalidate`
       * directive, which allows caches that support it to use the stale
       * version from the cache while they perform revalidation in the
       * background.
       */
      revalidate?: boolean | {allowStale: number};
    }
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: true;
      cache?: never;
      maxAge?: number;
      /**
       * Declares that this request is immutable. This means that it is
       * assumed to never change, and clients will never attempt to
       * revalidate the content. Be careful when using this option!
       */
      immutable?: boolean;
      revalidate?: never;
    };

/**
 * A hook to set the `Cache-Control` header on the response. If you provide
 * a string, this value will be used directly as the header value. Alternatively,
 * you can provide one of a couple different sets of options that represent
 * the different options you have for caching HTTP content.
 */
export function useCacheControl(value: string | CacheControlOptions) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    let normalizedValue: string;

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      const {
        private: isPrivate,
        cache,
        immutable,
        maxAge = immutable ? 31536000 : undefined,
        revalidate,
      } = value;

      normalizedValue = isPrivate ? 'private' : 'public';

      const appendToHeader = (value: string) => {
        normalizedValue = `${normalizedValue}, ${value}`;
      };

      if (cache === false) {
        appendToHeader('no-store');
      }

      if (maxAge === 0 && revalidate === true) {
        appendToHeader('no-cache');
      } else if (typeof maxAge === 'number' || revalidate) {
        appendToHeader(`max-age=${maxAge ?? 0}`);

        if (revalidate === true) {
          appendToHeader('must-revalidate');
        } else if (typeof revalidate === 'object') {
          appendToHeader(`stale-while-revalidate=${revalidate.allowStale}`);
        }
      }

      if (immutable) appendToHeader('immutable');
    }

    response.headers.append('Cache-Control', normalizedValue);
  });
}

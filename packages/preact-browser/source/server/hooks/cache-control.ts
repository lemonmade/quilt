import {
  cacheControlHeader,
  type CacheControlOptions,
} from '@quilted/browser/server';
import {useBrowserResponseAction} from './browser-response-action.ts';

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
      normalizedValue = cacheControlHeader(value);
    }

    response.headers.append('Cache-Control', normalizedValue);
  });
}

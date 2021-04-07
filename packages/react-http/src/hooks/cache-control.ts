import {useHttpAction} from './http-action';

// @see https://csswizardry.com/2019/03/cache-control-for-civilians/
export type CacheControlOptions =
  | {
      cache: false;
      maxAge?: never;
      immutable?: never;
      revalidate?: never;
    }
  | {
      cache?: never;
      maxAge?: number;
      immutable?: never;
      revalidate?: boolean | {allowStale: number};
    }
  | {
      cache?: never;
      maxAge?: number;
      immutable?: boolean;
      revalidate?: never;
    };

export function useCacheControl(value: string | CacheControlOptions) {
  useHttpAction((http) => {
    let normalizedValue: string;

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      normalizedValue = 'public';

      const appendToHeader = (value: string) => {
        normalizedValue = `${normalizedValue}, ${value}`;
      };

      const {
        cache,
        immutable,
        maxAge = immutable ? 31536000 : undefined,
        revalidate,
      } = value;

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

        if (immutable) appendToHeader('immutable');
      }
    }

    http.setHeader('Cache-Control', normalizedValue);
  });
}

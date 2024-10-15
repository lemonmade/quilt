import {
  computed,
  resolveSignalOrValue,
  type ReadonlySignal,
} from '@quilted/signals';
import {useLink} from '@quilted/preact-browser';
import {useMemo} from 'preact/hooks';

export type Options =
  | {
      /**
       * Indicates that this alternate URL is the “canonical” (primary)
       * URL for this page.
       */
      canonical: true;
      locale?: never;
    }
  | {
      canonical?: never;
      /**
       * Indicates that this alternate URL is the same page, but in a
       * different locale.
       */
      locale: string;
    };

/**
 * Adds a `<link>` tag that specifies an alternate URL for this page.
 */
export function useAlternateURL(
  url: string | URL | ReadonlySignal<string | URL>,
  {canonical, locale}: Options,
) {
  const link = useMemo(
    () =>
      computed(() => {
        const rel = canonical ? 'canonical' : 'alternate';

        const link = {
          rel,
          href: resolveSignalOrValue(url).toString(),
        };

        if (locale) {
          Object.assign(link, {hreflang: locale});
        }

        return link;
      }),
    [url, canonical, locale],
  );

  return useLink(link);
}

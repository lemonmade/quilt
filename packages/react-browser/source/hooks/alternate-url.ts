import {
  computed,
  resolveSignalOrValue,
  type ReadonlySignal,
} from '@quilted/signals';
import {useBrowserEffect} from './browser-effect.ts';

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
export function useAlternateUrl(
  url: string | URL | ReadonlySignal<string | URL>,
  {canonical, locale}: Options,
) {
  useBrowserEffect(
    (browser) => {
      const link = computed(() =>
        canonical
          ? {
              rel: 'canonical',
              href: resolveSignalOrValue(url).toString(),
            }
          : {
              rel: 'alternate',
              href: resolveSignalOrValue(url).toString(),
              hrefLang: locale,
            },
      );

      return browser.links.add(link);
    },
    [url, canonical, locale],
  );
}

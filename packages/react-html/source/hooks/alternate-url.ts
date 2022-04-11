import {useDomEffect} from './dom-effect';

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
  url: string | URL,
  {canonical, locale}: Options,
) {
  useDomEffect(
    (manager) =>
      manager.addLink(
        canonical
          ? {
              rel: 'canonical',
              href: url.toString(),
            }
          : {rel: 'alternate', href: url.toString(), hrefLang: locale},
      ),
    [canonical, locale],
  );
}

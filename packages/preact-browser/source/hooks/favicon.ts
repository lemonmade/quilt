import type {BrowserDetails, BrowserLinkAttributes} from '@quilted/browser';
import {effect, isSignal, type ReadonlySignal} from '@quilted/signals';

import {useBrowserEffect} from './browser-effect.ts';

export interface FaviconOptions {
  /**
   * The image MIME type, which will be used as the `type` attribute on the
   * underlying `<link>` tag.
   */
  type?: string;
}

/**
 * Adds a favicon to your website, using a `<link rel="icon">` tag.
 */
export function useFavicon(source: string, {type}: FaviconOptions = {}) {
  useBrowserEffect(
    (browser) =>
      browser.links.add(
        type
          ? {
              rel: 'icon',
              type,
              href: source,
            }
          : {rel: 'icon', href: source},
      ),
    [source, type],
  );
}

/**
 * One icon in a set of icons managed by `useFavicons()` or
 * `<Favicon icons={…} />`.
 */
export interface FaviconIcon {
  /**
   * A URI for the icon, used as the `href` of the underlying `<link>` tag.
   */
  source: string;

  /**
   * The `rel` of the underlying `<link>` tag.
   *
   * @default 'icon'
   */
  rel?: 'icon' | 'apple-touch-icon' | (string & {});

  /**
   * The sizes the icon is suitable for, like `32x32`, `16x16 32x32` or `any`.
   */
  sizes?: string;

  /**
   * The image MIME type, which will be used as the `type` attribute on the
   * underlying `<link>` tag.
   */
  type?: string;
}

/**
 * Adds a complete set of icon `<link>` tags (for example, several sizes of
 * favicon plus an `apple-touch-icon`) to the `<head>` of the document.
 *
 * The set is managed as a unit: whenever any icon in it changes, every link
 * from the previous set is removed before the links for the new set are
 * inserted. Browsers (WebKit in particular) only notice icon changes when the
 * `<link>` is inserted, and choose from all the icon links in the `<head>`, so
 * swapping the whole set at once keeps a stale size from winning.
 *
 * You can pass a signal of icons to update the set without re-rendering.
 */
export function useFavicons(
  icons: readonly FaviconIcon[] | ReadonlySignal<readonly FaviconIcon[]>,
) {
  useBrowserEffect(
    (browser) => {
      if (!isSignal(icons)) return addFaviconLinks(browser, icons);

      let removeLinks: (() => void) | undefined;

      const stop = effect(() => {
        const currentIcons = icons.value;
        removeLinks?.();
        removeLinks = addFaviconLinks(browser, currentIcons);
      });

      return () => {
        stop();
        removeLinks?.();
      };
    },
    [isSignal(icons) ? icons : JSON.stringify(icons)],
  );
}

export function faviconLinkAttributes({
  source,
  rel = 'icon',
  sizes,
  type,
}: FaviconIcon): BrowserLinkAttributes {
  const attributes: BrowserLinkAttributes = {rel, href: source};
  if (sizes) attributes.sizes = sizes;
  if (type) attributes.type = type;
  return attributes;
}

function addFaviconLinks(
  browser: BrowserDetails,
  icons: readonly FaviconIcon[],
) {
  const removes = icons.map((icon) =>
    browser.links.add(faviconLinkAttributes(icon)),
  );

  return () => {
    for (const remove of removes) remove();
  };
}

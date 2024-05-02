import type {BrowserLinkAttributes} from '@quilted/browser';
import {isSignal, type ReadonlySignal} from '@quilted/signals';

import {useBrowserEffect} from './browser-effect.ts';

/**
 * Adds a `<link>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function useLink(
  link:
    | false
    | null
    | undefined
    | BrowserLinkAttributes
    | ReadonlySignal<BrowserLinkAttributes>,
) {
  useBrowserEffect(
    (browser) => {
      if (link) return browser.links.add(link);
    },
    [isSignal(link) || !link ? link : JSON.stringify(link)],
  );
}

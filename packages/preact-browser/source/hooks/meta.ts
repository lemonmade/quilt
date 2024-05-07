import type {BrowserMetaAttributes} from '@quilted/browser';
import {isSignal, type ReadonlySignal} from '@quilted/signals';

import {useBrowserEffect} from './browser-effect.ts';

/**
 * Adds a `<meta>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
 */
export function useMeta(
  meta:
    | false
    | null
    | undefined
    | BrowserMetaAttributes
    | ReadonlySignal<BrowserMetaAttributes>,
) {
  useBrowserEffect(
    (browser) => {
      if (meta) return browser.metas.add(meta);
    },
    [isSignal(meta) || !meta ? meta : JSON.stringify(meta)],
  );
}

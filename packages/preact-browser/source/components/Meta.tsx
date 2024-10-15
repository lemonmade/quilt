import type {BrowserMetaAttributes} from '@quilted/browser';

import {useMeta} from '../hooks/meta.ts';
import {useBrowserEffectsAreActive} from '../context.ts';

/**
 * Adds a `<meta>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
 */
export function Meta(options: BrowserMetaAttributes) {
  if (!useBrowserEffectsAreActive()) return <meta {...(options as any)} />;

  useMeta(options);
  return null;
}

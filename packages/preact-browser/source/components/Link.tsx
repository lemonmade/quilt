import type {BrowserLinkAttributes} from '@quilted/browser';

import {useLink} from '../hooks/link.ts';
import {useBrowserEffectsAreActive} from '../context.ts';

/**
 * Adds a `<link>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function Link(options: BrowserLinkAttributes) {
  if (!useBrowserEffectsAreActive()) return <link {...(options as any)} />;

  useLink(options);
  return null;
}

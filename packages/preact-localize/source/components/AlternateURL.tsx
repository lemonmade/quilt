import {Link} from '@quilted/preact-browser';
import {resolveSignalOrValue} from '@quilted/signals';

import type {useAlternateURL} from '../hooks/alternate-url.ts';

export type Props = Parameters<typeof useAlternateURL>[1] & {
  /**
   * An alternative URL for this page.
   */
  url: Parameters<typeof useAlternateURL>[0];
};

/**
 * Adds a `<link>` tag that specifies an alternate URL for this page.
 * You can pass the `canonical` prop (which can only be `true`) to indicate
 * that this alternate URL is the canonical (primary) URL for the page.
 * Alternatively, you can pass
 */
export function AlternateURL({url, canonical, locale}: Props) {
  return (
    <Link
      rel={canonical ? 'canonical' : 'alternate'}
      href={resolveSignalOrValue(url).toString()}
      hreflang={locale}
    />
  );
}

import {useAlternateUrl} from '../hooks';

export type Props = Parameters<typeof useAlternateUrl>[1] & {
  /**
   * An alternative URL for this page.
   */
  url: Parameters<typeof useAlternateUrl>[0];
};

/**
 * Adds a `<link>` tag that specifies an alternate URL for this page.
 * You can pass the `canonical` prop (which can only be `true`) to indicate
 * that this alternate URL is the canonical (primary) URL for the page.
 * Alternatively, you can pass
 */
export function Alternate({url, ...options}: Props) {
  useAlternateUrl(url, options);
  return null;
}

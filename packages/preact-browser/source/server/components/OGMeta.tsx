import {useOGMeta, type OGMetaOptions} from '../hooks/og-meta.ts';

export interface OGMetaProps extends OGMetaOptions {}

/**
 * Sets `og:` meta tags for the current page.
 *
 * @see https://ogp.me
 */
export function OGMeta(props: OGMetaProps) {
  if (typeof document === 'object') return null;
  useOGMeta(props);
  return null;
}

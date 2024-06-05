import {useOpenGraph, type OpenGraphOptions} from '../hooks/open-graph.ts';

export interface OpenGraphProps extends OpenGraphOptions {}

/**
 * Sets `og:` meta tags for the current page.
 *
 * @see https://ogp.me
 */
export function OpenGraph(props: OpenGraphProps) {
  if (typeof document === 'object') return null;
  useOpenGraph(props);
  return null;
}

import {useSearchRobots} from '../hooks/search-robots.ts';

/**
 * Adds a `robots` `<meta>` tag to the `<head>` of the document. You can
 * customize the behavior of search indexing by passing any subset
 * of the available robot options.
 *
 * @see https://developers.google.com/search/docs/advanced/robots/robots_meta_tag
 */
export function SearchRobots(options: Parameters<typeof useSearchRobots>[0]) {
  useSearchRobots(options);
  return null;
}

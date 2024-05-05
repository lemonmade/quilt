import {useBrowserDetails} from '../../context.ts';

export type ImagePreviewSize = 'standard' | 'large';

export interface Options {
  /**
   * The name of the search robot you are targeting.
   *
   * @default 'robots'
   * @example 'googlebot'
   */
  name?: string;

  /**
   * Whether this page should appear in search engines.
   */
  index?: boolean;

  /**
   * Whether images in this page should appear in search engines.
   */
  indexImages?: boolean;

  /**
   * Whether links on this page are followed by search engine
   * crawlers.
   */
  follow?: boolean;

  /**
   * Whether a search engine should cache the page and show that
   * for future search results.
   *
   * @see https://support.google.com/websearch/answer/1687222
   */
  archive?: boolean;

  /**
   * Whether a search engine should offer translations of this page in
   * search results.
   */
  translate?: boolean;

  /**
   * Determines how search engines should present a textual summary of
   * this page in search results. If `false` is passed, search engines
   * will be instructed not to show any snippet with search results.
   * Alternatively, you can pass an object with a `maxLength` property,
   * which will restrict snippets to that number of characters.
   */
  snippet?: boolean | {maxLength: number};

  /**
   * Determines how search engines should present images for this
   * page in search results. If `false` is passed, search engines will
   * be instructed not to show image previews. Alternatively, you can
   * pass an object with a `maxSize` field that is one of `'standard'`
   * or `'large'`, with `'large'` allowing a larger image (up to the
   * size of the viewport) to be shown in search results.
   */
  imagePreviews?: boolean | {maxSize: ImagePreviewSize};

  /**
   * Determines how search engines should present videos for this
   * page in search results. If `false` is passed, search engines will
   * be instructed not to show video previews (it may still present a
   * still of the video, depending on how you have configured the
   * `imagePreviews` option). Alternatively, you can pass an object
   * with a `maxLength` field that specifies the maximum length of
   * the video preview (in seconds)
   */
  videoPreviews?: boolean | {maxLength: number};

  /**
   * Indicates that search engines should not show this page after
   * the provided date.
   */
  unavailableAfter?: Date;
}
/**
 * Adds a `robots` `<meta>` tag to the `<head>` of the document. You can
 * customize the behavior of search indexing by passing any subset
 * of the available robot options.
 *
 * @see https://developers.google.com/search/docs/advanced/robots/robots_meta_tag
 */
export function useSearchRobots({
  name = 'robots',
  index,
  indexImages,
  follow,
  archive,
  translate,
  snippet,
  imagePreviews,
  videoPreviews,
  unavailableAfter,
}: Options) {
  if (typeof document === 'object') return;

  const browser = useBrowserDetails();

  const directives: string[] = [];

  if (index === false) {
    directives.push('noindex');
  }

  if (indexImages === false) {
    directives.push('noimageindex');
  }

  if (follow === false) {
    directives.push('nofollow');
  }

  if (archive === false) {
    directives.push('noarchive');
  }

  if (translate === false) {
    directives.push('notranslate');
  }

  if (snippet === false) {
    directives.push('nosnippet');
  } else if (typeof snippet === 'object') {
    directives.push(`max-snippet:${snippet.maxLength}`);
  }

  if (imagePreviews === false) {
    directives.push('max-image-preview:none');
  } else if (typeof imagePreviews === 'object') {
    directives.push(`max-video-preview:${imagePreviews.maxSize}`);
  }

  if (videoPreviews === false) {
    directives.push('max-video-preview:0');
  } else if (typeof videoPreviews === 'object') {
    directives.push(`max-video-preview:${videoPreviews.maxLength}`);
  }

  if (unavailableAfter != null) {
    directives.push(`unavailable_after:${unavailableAfter.toISOString()}`);
  }

  if (directives.length === 0) return;

  return browser.metas.add({
    name,
    content: directives.join(', '),
  });
}

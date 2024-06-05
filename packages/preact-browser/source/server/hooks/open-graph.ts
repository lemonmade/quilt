import {useBrowserDetails} from '../../context.ts';

/**
 * @see https://ogp.me/#types
 */
export type OpenGraphType =
  | 'music.song'
  | 'music.album'
  | 'music.playlist'
  | 'music.radio_station'
  | 'video.movie'
  | 'video.episode'
  | 'video.tv_show'
  | 'video.other'
  | 'article'
  | 'book'
  | 'profile'
  | 'website';

export interface OpenGraphOptions {
  /**
   * The description to set in the `og:description` meta tag.
   * @see https://ogp.me
   */
  type?: OpenGraphType;

  /**
   * The title to set in the `og:title` meta tag.
   * @see https://ogp.me
   */
  title?: string;

  /**
   * The description to set in the `og:description` meta tag.
   * @see https://ogp.me
   */
  description?: string;

  /**
   * The URL to set in the `og:url` meta tag. When set to `true`, the current
   * URL of the request will be used.
   * @see https://ogp.me
   */
  url?: string | URL | boolean;

  /**
   * The URL to set in the `og:image` meta tag.
   * @see https://ogp.me
   */
  image?: string | URL;

  /**
   * An additional `og:` meta tag to set. The property can either be passed
   * with or without the `og:` prefix. When set, you must also provide the
   * `content` prop.
   *
   * @see https://ogp.me
   */
  property?: string;

  /**
   * The content for an additional `og:` meta tag. When set, you must also
   * provide the `property` prop.
   *
   * @see https://ogp.me
   */
  content?: string;
}

/**
 * Sets the `og:` meta tag for the current page. The property can either
 * be passed with or without the `og:` prefix.
 *
 * @see https://ogp.me
 */
export function useOpenGraph(property: string, content: string): void;

/**
 * Sets `og:` meta tags for the current page.
 *
 * @see https://ogp.me
 */
export function useOpenGraph(options: OpenGraphOptions): void;
export function useOpenGraph(
  property: string | OpenGraphOptions,
  content?: string,
) {
  if (typeof document === 'object') return;

  const browser = useBrowserDetails();

  if (typeof property === 'string') {
    browser.metas.add({
      property: property.startsWith('og:') ? property : `og:${property}`,
      content,
    });

    return;
  }

  const {
    type,
    url,
    title,
    description,
    image,
    property: actualProperty,
    content: actualContent,
  } = property;

  if (type) {
    browser.metas.add({property: 'og:type', content: type});
  }

  if (url) {
    browser.metas.add({
      property: 'og:url',
      content:
        typeof url === 'boolean'
          ? useBrowserDetails().request.url
          : url.toString(),
    });
  }

  if (title) {
    browser.metas.add({property: 'og:title', content: title});
  }

  if (description) {
    browser.metas.add({property: 'og:description', content: description});
  }

  if (image) {
    browser.metas.add({property: 'og:image', content: image.toString()});
  }

  if (actualProperty && actualContent) {
    browser.metas.add({
      property: actualProperty.startsWith('og:')
        ? actualProperty
        : `og:${actualProperty}`,
      content: actualContent,
    });
  }
}

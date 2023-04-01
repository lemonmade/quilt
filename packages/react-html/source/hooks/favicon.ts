import {useDomEffect} from './dom-effect.ts';

export interface FaviconOptions {
  /**
   * The image MIME type, which will be used as the `type` attribute on the
   * underlying `<link>` tag.
   */
  type?: string;
}

/**
 * Adds a favicon to your website, using a `<link rel="icon">` tag.
 */
export function useFavicon(source: string, {type}: FaviconOptions = {}) {
  useDomEffect(
    (manager) =>
      manager.addLink(
        type
          ? {
              rel: 'icon',
              type,
              href: source,
            }
          : {rel: 'icon', href: source},
      ),
    [source],
  );
}

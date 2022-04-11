import {useDomEffect} from './dom-effect';

interface Options {
  /**
   * Whether the viewport should cover any physical “notches” of the
   * user’s device.
   *
   * @default true
   */
  cover?: boolean;
}

/**
 * Adds a `viewport` `<meta>` tag to the `<head>` of the document.
 * The viewport directive sets a good baseline for response HTML
 * documents, and prevents disabling zoom, a common accessibility
 * mistake.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 */
export function useViewport({cover = true}: Options) {
  useDomEffect(
    (manager) => {
      const parts = [
        'width=device-width, initial-scale=1.0, height=device-height',
      ];

      if (cover) parts.push('viewport-fit=cover');

      return manager.addMeta({
        name: 'viewport',
        content: parts.join(', '),
      });
    },
    [cover],
  );
}

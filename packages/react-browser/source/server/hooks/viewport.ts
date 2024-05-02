import {useBrowserDetails} from '../../context.ts';

interface Options {
  /**
   * Whether the viewport should cover any physical “notches” of the
   * user’s device.
   *
   * @default true
   */
  cover?: boolean;

  /**
   * What effect interactive UI elements, like the virtual keyboard,
   * should have on viewport sizes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag#interactive-widget
   */
  interactiveWidget?: 'resizes-visual' | 'resizes-content' | 'overlays-content';
}

/**
 * Adds a `viewport` `<meta>` tag to the `<head>` of the document.
 * The viewport directive sets a good baseline for response HTML
 * documents, and prevents disabling zoom, a common accessibility
 * mistake.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 */
export function useViewport({cover = true, interactiveWidget}: Options) {
  if (typeof document === 'object') return;

  const browser = useBrowserDetails();

  const parts = ['width=device-width, initial-scale=1.0, height=device-height'];

  if (cover) {
    parts.push('viewport-fit=cover');
  }

  if (interactiveWidget) {
    parts.push(`interactive-widget=${interactiveWidget}`);
  }

  browser.metas.add({
    name: 'viewport',
    content: parts.join(', '),
  });
}

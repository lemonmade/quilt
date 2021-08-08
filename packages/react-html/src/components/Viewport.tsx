import {useViewport} from '../hooks';

/**
 * Adds a `viewport` `<meta>` tag to the `<head>` of the document.
 * The viewport directive sets a good baseline for response HTML
 * documents, and prevents disabling zoom, a common accessibility
 * mistake.
 *
 * By default, this component will add the viewport-fit=cover directive,
 * which causes the page to overlap any physical “notches” of the
 * user’s device. You can disable this behavior by setting the
 * `cover` prop to `false`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 */
export function Viewport(options: Parameters<typeof useViewport>[0]) {
  useViewport(options);
  return null;
}

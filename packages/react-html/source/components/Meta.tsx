import {useMeta} from '../hooks/meta.ts';

/**
 * Adds a `<meta>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
 */
export function Meta(options: Exclude<Parameters<typeof useMeta>[0], false>) {
  useMeta(options);
  return null;
}

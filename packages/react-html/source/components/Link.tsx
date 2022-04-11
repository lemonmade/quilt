import {useLink} from '../hooks';

/**
 * Adds a `<link>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function Link(options: Exclude<Parameters<typeof useLink>[0], false>) {
  useLink(options);
  return null;
}

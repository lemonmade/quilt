import {useHeadStyle} from '../hooks/head-style.ts';

/**
 * Adds a stylesheet `<link>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function HeadStyle(
  options: Exclude<
    Parameters<typeof useHeadStyle>[0],
    string | false | null | undefined
  >,
) {
  useHeadStyle(options);
  return null;
}

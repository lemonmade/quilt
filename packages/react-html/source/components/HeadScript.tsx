import {useHeadScript} from '../hooks/head-script.ts';

/**
 * Adds a `<script>` tag to the `<head>` of the document with the
 * provided attributes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
 */
export function HeadScript(
  options: Exclude<
    Parameters<typeof useHeadScript>[0],
    string | false | null | undefined
  >,
) {
  useHeadScript(options);
  return null;
}

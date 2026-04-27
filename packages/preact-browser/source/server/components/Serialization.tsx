import {useBrowserEffectsAreActive} from '../../context.ts';
import {useResponseSerialization} from '../hooks/serialization.ts';

/**
 * Sets a serialization for the HTML response. This value can then be read on the client
 * using the `useSerialized()` hook.
 */
export function Serialization({
  name,
  content,
}: {
  name: string;
  content: unknown;
}) {
  if (!useBrowserEffectsAreActive()) {
    // Render the SSR payload as a non-executing <script> tag instead of an
    // unknown custom element. Two reasons:
    //
    // 1. The default `HTMLTemplate` now puts serializations in `<head>`, and
    //    the HTML parser treats unknown elements (like `<browser-serialization>`)
    //    as flow content. Encountering one in the head closes `<head>` and
    //    opens `<body>`, so the serializations would silently relocate and
    //    drag the asset placeholders that follow them out with them. A
    //    `<script>` element is metadata-content and stays in the head.
    // 2. In Safari (and to a lesser extent other engines) a stretch of unknown
    //    body elements arriving before any `<link rel=stylesheet>` flips the
    //    parser into "the body has started" mode, and `blocking="render"`
    //    on links that follow doesn't reliably block the paint of the
    //    elements that came before.
    //
    // The script's `type` is non-executing (the browser only runs `text/javascript`
    // / module scripts), so the JSON body is treated as plain text. Every "<"
    // is escaped to its unicode form so a literal "</script>" inside a
    // serialized value can't terminate the tag (and HTML comment / CDATA
    // prefixes can't sneak in either).
    return (
      <script
        type="quilt/serialization"
        data-name={name}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(content).replace(/</g, '\\u003c'),
        }}
      />
    );
  }

  if (typeof document === 'object') return null;

  useResponseSerialization(name, content);
  return null;
}

---
'@quilted/preact-browser': patch
'@quilted/browser': patch
---

Move `HTMLTemplate` serializations and asset placeholders into `<head>` by default

`HTMLTemplate.Body` previously rendered the `<HTMLTemplate.Serializations />` and `<HTMLTemplate.Assets />` placeholders directly inside `<body>`, ahead of the app content. That layout produced a Safari-specific flash of unstyled content on initial paint: body-positioned `<link rel=stylesheet>` (even with `blocking="render"`) didn't reliably stop the parser from committing the body content that preceded them.

The default placement is now:

- `HTMLTemplate.Head` renders title/links/metas, then `<HTMLTemplate.Serializations />`, then the three `<HTMLTemplate.Assets />` placeholders (entry, async, preload) — same order `HTMLTemplate.Body` used to use.
- `HTMLTemplate.Body` renders only the wrapper + `<HTMLTemplate.Content />`.

Stylesheet links land in `<head>`, where they block initial render the standards-correct way; `Link: rel=preload` HTTP headers and the in-document `<link>` tags now consistently target the same location, so the preload scanner picks the same URLs both ways.

Apps that already pass a custom `head={…}` or `body={…}` to `HTMLTemplate` aren't affected — the change is in the default content of `HTMLTemplateHead` / `HTMLTemplateBody`, which only takes effect when the `children` prop on those components isn't provided.

`<Serialization>` now renders as `<script type="quilt/serialization" data-name=...>JSON</script>` instead of `<browser-serialization name=... content=...>`. The script form is required for the head positioning above: `<browser-serialization>` is unknown to the HTML parser, which treats it as flow content; encountering one in `<head>` would close `<head>` and start `<body>`, dragging the asset placeholders out of the head with it. The script form is parser-safe in both head and body, doesn't execute (the type isn't a recognized JS MIME), and the JSON payload escapes "<" to its unicode form so a `</script>` inside a serialized value can't terminate the tag. The client-side reader (`BrowserSerializations`) was updated to match; the legacy `BrowserSerializationElement` custom-element class still works for anyone defining it programmatically (the read path falls back to its `name` / `content` attributes).

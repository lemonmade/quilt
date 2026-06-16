---
'@quilted/preact-browser': patch
---

Tie the asset-preload `Link` response header to streaming, and add a structured `stream` option

`renderAppToHTMLResponse` / `renderToHTMLResponse` emitted a `Link` response header preloading the entry's assets on every render. That header duplicates the `<link rel="modulepreload">` / `rel="stylesheet">` tags already in the document `<head>`, and for a large entry preload set it can exceed HTTP/3 (QPACK) header-size limits — stalling the response in browsers that negotiate HTTP/3 (the document hangs `pending`), while HTTP/2 clients are unaffected.

The header only helps as an early hint while a response is still **streaming**; for a buffered response it's pure duplication. So it now follows the streaming setting, and `stream` accepts a structured form to control the two independently:

```ts
stream?: boolean | {html?: boolean; preload?: boolean}
```

- `false` (default): buffer the HTML and **do not** emit the preload header.
- `true`: stream the HTML and emit the preload header.
- `{html?, preload?}`: control each independently (e.g. `{html: true, preload: false}` to stream without the header). `preload` defaults to `html`.

Note: this changes the default for buffered responses — they no longer emit the preload `Link` header. Pass `stream: {preload: true}` to restore it.

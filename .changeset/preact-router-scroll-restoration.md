---
'@quilted/preact-router': minor
---

Added automatic scroll restoration to `Navigation`

In a single-page app the browser's native scroll restoration is unreliable: on a back/forward navigation it restores the scroll offset against the document as it exists at `popstate` time, but an async route hasn't rendered its content yet, so it restores against the wrong (usually shorter) document and lands at the wrong offset. Forward navigations are also frequently left at the previous page's offset instead of the top.

`Navigation` now owns scroll restoration. In the browser it switches `history.scrollRestoration` to `'manual'` and keeps its own per-entry scroll offsets, keyed by navigation id and persisted to `sessionStorage` (so they survive a reload within the tab session):

- a forward navigation resets to the top, or scrolls to the URL hash target when present;
- a back/forward navigation restores the offset the entry was last left at;
- a reload restores the offset of the entry it lands on.

Offsets that need the destination route's content committed (a restore or a hash target) are applied on the next animation frame; a plain reset to the top is applied synchronously to avoid a flash of the new route at the previous offset.

This is enabled by default. Pass `scrollRestoration: false` to leave scrolling entirely to the browser/your app:

```ts
const navigation = new Navigation(initialURL, {scrollRestoration: false});
```

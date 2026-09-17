---
'@quilted/browser': patch
---

Fix `BrowserHeadElements.add()` re-adopting a server-rendered `<head>` element after an earlier teardown removed it. A reactive head value that returned to its server-rendered value (for example a `theme-color` that goes dark → light → dark) left no element in the document at all. Each server-rendered element is now adopted at most once, and later matching calls append a fresh element.

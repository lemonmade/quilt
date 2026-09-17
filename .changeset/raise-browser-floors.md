---
'@quilted/preact-browser': patch
'@quilted/preact-async': patch
'@quilted/preact-email': patch
'@quilted/preact-localize': patch
'@quilted/preact-router': patch
'@quilted/quilt': patch
---

Raise the minimum `@quilted/browser` version to `0.2.7` (through `@quilted/preact-browser`), so installs pick up the fix that re-inserts a server-rendered `<head>` element after an earlier teardown removed it. Without it, a reactive `<ThemeColor>` or other head value that returns to its server-rendered value leaves no element in the document.

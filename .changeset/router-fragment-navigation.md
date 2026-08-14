---
'@quilted/preact-router': patch
---

Stop browser fragment navigations from being adopted as the first history entry.

Clicking an in-page link (`<a href="#section">`) is a same-document navigation
the router did not perform: the browser pushes the entry with a null
`history.state`, so there is no navigation id on it to recognise. `popstate`'s
handler fell back to the _first_ entry of the session and adopted it wholesale,
with two visible consequences — `currentRequest` reported the pre-fragment URL
while the address bar showed the hash, and scroll restoration put the reader
back at that entry's saved offset, undoing the jump the browser had just made.
On a long document with a table of contents, every entry appeared to bounce the
reader back to the top of the page.

A cached request is now only adopted when its URL is actually the one that was
landed on. An unrecognised entry gets an id of its own, stamped into
`history.state` so a later traversal back to it is recognised, rather than
overwriting the first entry's record and the scroll offset stored against it.

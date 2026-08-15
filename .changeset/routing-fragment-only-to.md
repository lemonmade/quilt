---
'@quilted/routing': patch
---

Resolve a fragment-only or search-only `to` against the current URL.

`resolveURL` handled three shapes of string: one starting with `/` (an absolute
path, prefixed with the base), one that parses as a full URL, and everything
else as a **relative path**, joined onto the current pathname. A bare `#section`
or `?page=2` fell into that last case, so an in-page link resolved to
`/privacy/#section` — a different path than the page it was on — and dropped the
search params along the way.

Neither `#` nor `?` can begin a relative path, so both are unambiguous: they name
a place on the page you are already on. They now resolve against the current URL
with the URL parser, which keeps everything to the left untouched — the path, and
for a fragment the search params too. The base prefix is not re-applied, since
the pathname isn't changing.

This makes `<Link to="#section">` and `navigate('#section')` work as written.

---
'@quilted/preact-graphql': patch
---

Track the current `@quilted/graphql`

`@quilted/preact-graphql` still pinned `@quilted/graphql` at `^3.4.1` (it wasn't co-released when `@quilted/graphql` reached 3.5.0), so consumers on graphql-js 17 could resolve its `@quilted/graphql` to the older graphql-16-only build and end up with two graphql copies. Bump the range to `^3.5.0` to match the rest of the workspace.

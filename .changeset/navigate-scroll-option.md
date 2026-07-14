---
'@quilted/preact-router': minor
---

Added a `scroll` option to `Navigation.navigate()` and `<Link>`, and aligned the default scroll behavior of replace navigations with other routers.

Every forward navigation — push or replace — now resets the scroll position to the top of the page (or to the URL's hash target), matching the defaults of React Router (`preventScrollReset`), Next.js (`scroll`), and TanStack Router (`resetScroll`). Previously, replace navigations kept the page where it was.

To keep the current scroll position — for example, when the URL encodes UI state like filters, tabs, or a selected calendar day — pass `scroll: false`:

```ts
navigation.navigate(url, {replace: true, scroll: false});
```

```tsx
<Link to={url} scroll={false}>
  Select day
</Link>
```

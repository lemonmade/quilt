---
'@quilted/preact-router': minor
---

Added a `scroll` option to `Navigation.navigate()` and `<Link>`, and made the URL change — not the history operation — decide the default scroll behavior.

For push and replace navigations alike, the default is now:

- Changing the **pathname or hash** resets the scroll position to the top of the page (or scrolls to the URL's hash target). Previously, replace navigations never reset.
- Changing **only the search params** keeps the current scroll position — search-only navigations usually encode UI state (filters, tabs, a selected calendar day) rather than a new location. Previously, push navigations always reset.

Pass `scroll` to override the default in either direction:

```ts
navigation.navigate(url, {scroll: false});
```

```tsx
<Link to={url} scroll={false}>
  Select day
</Link>
```

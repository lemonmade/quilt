---
'@quilted/preact-router': minor
---

Use `entry.key` (not `entry.id`) as the Preact `key` for each rendered route

Previously, `useRoutes` used `entry.id` as the Preact `key` on every `RouteNavigationRenderer` in the stack. `entry.id` is constructed as `${matchID}:${loadID}` where `matchID` starts with the per-navigation `request.id`, so it changed on every call to `navigation.navigate()`. Preact treats a single child whose `key` has changed as a different element, so the entire matched route tree — including persistent parent frames — unmounted and remounted on every navigation. That destroyed state in parent layouts (top bars, section nav, persistent models), replayed CSS transitions from scratch, and threw away Preact reconciliation work.

`entry.key` already exists for this exact purpose: it's derived from the route's match (stable per logical route pattern) or from a user-supplied `route.key` string / array / function. Switching the renderer to use `entry.key` means:

- Navigating to the same logical route keeps the same component instance mounted.
- Navigating to a different route pattern (or one where the user's `key` function returns a different value) remounts as you'd expect.
- The `key` option on route definitions, which until now only influenced load caching, now also does what its name implies — it controls reconciliation.

```tsx
useRoutes([
  // Persistent top-bar frame — stays mounted across all child navigations.
  {
    match: true,
    render: (children) => <Frame>{children}</Frame>,
    children: [
      {match: '/activities', render: <ActivitiesPage />},
      {match: '/staff', render: <StaffPage />},

      // Dynamic route with a custom key: remount only when :id changes,
      // not on every navigation to the same id.
      route(/[/]activity[/](?<id>[\w-]+)/, {
        key: (entry) => entry.matched.groups?.id,
        render: <ActivityDetailPage />,
      }),
    ],
  },
]);
```

**Breaking change for apps that rely on the remount-per-navigation side effect** (fresh `useState` / `useEffect` re-running on every navigation, even to the same URL). If you need that behavior, supply a `key` function that returns a new value each call (e.g. `key: () => Math.random()`).

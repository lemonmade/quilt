---
'@quilted/threads': minor
---

`ThreadWindow`'s `targetOrigin` option now also validates the `origin` of incoming messages, and gained an `'ancestor'` mode.

Previously `targetOrigin` only set the origin for outgoing `postMessage()` calls; inbound messages were accepted from any origin as long as they came from the expected window. It is now also used to reject messages whose `origin` does not match, so a concrete `targetOrigin` authenticates both directions:

```ts
const thread = ThreadWindow.iframe(iframe, {
  targetOrigin: 'https://embed.my-app.com',
  exports: {/* ... */},
});
```

The default remains `'*'` (post to, and accept from, any origin), so existing behaviour is unchanged.

You can also pass `targetOrigin: 'ancestor'` to pin to the origin that framed the current window — read from `location.ancestorOrigins`, falling back to the origin of the first received message on platforms without that API (e.g. Firefox), buffering outgoing messages until it is known. This is convenient inside an `iframe` that trusts its embedder but doesn't know the embedder's origin ahead of time:

```ts
const thread = ThreadWindow.parent({targetOrigin: 'ancestor'});
```

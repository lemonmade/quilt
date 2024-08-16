---
'@quilted/threads': major
'@quilted/quilt': patch
---

Changed `ThreadAbortSignal` utilities to be class-based instead of being a collection of utility functions. This change aligns the API more closely with `AbortController` in the browser, which is created with `new AbortController()`.

Previously, you used `createThreadAbortSignal()` to serialize an `AbortSignal` to pass over a thread, and `acceptThreadAbortSignal()` to turn it into a “live” `AbortSignal`. With the new API, you will do the same steps, but with `ThreadAbortSignal.serialize()` and `new ThreadAbortSignal`:

```ts
import {
  createThreadAbortSignal,
  acceptThreadAbortSignal,
} from '@quilted/threads';

const abortController = new AbortController();
const serializedAbortSignal = createThreadAbortSignal(abortController.signal);
const liveAbortSignal = acceptThreadAbortSignal(serializedAbortSignal);

await fetch('/', {signal: liveAbortSignal});

// Becomes:

import { ThreadAbortSignal } from '@quilted/threads';\

const abortController = new AbortController();
const serializedAbortSignal = ThreadAbortSignal.serialize(abortController.signal);
const liveAbortSignal = new ThreadAbortSignal(serializedAbortSignal);

await fetch('/', {signal: liveAbortSignal});
```

Additionally, the new `ThreadAbortSignal` class assumes you are not doing manual memory management by default. If your target environment does not support automatic memory management of transferred functions, you will need to manually pass the `retain` and `release` functions to the new APIs:

```ts
import {retain, release, ThreadAbortSignal} from '@quilted/threads';

const abortController = new AbortController();
const serializedAbortSignal = ThreadAbortSignal.serialize(
  abortController.signal,
  {retain, release},
);
const liveAbortSignal = new ThreadAbortSignal(serializedAbortSignal, {
  retain,
  release,
});

await fetch('/', {signal: liveAbortSignal});
```

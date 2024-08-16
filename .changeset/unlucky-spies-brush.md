---
'@quilted/threads': major
'@quilted/events': patch
'@quilted/quilt': patch
---

Changed Preact thread utilities to be class-based instead of being a collection of utility functions.

Previously, you used `createThreadSignal()` to serialize a Preact signal to pass over a thread, and `acceptThreadSignal()` to turn it into a "live" signal. With the new API, you will do the same steps, but with `ThreadSignal.serialize()` and `new ThreadSignal()`:

```js
import {signal, computed} from '@preact/signals-core';
import {ThreadWebWorker, ThreadSignal} from '@quilted/threads';

// Old API:
const result = signal(32);
const serializedSignal = createThreadSignal(result);
await thread.imports.calculateResult(serializedSignal);

// New API:
const result = signal(32);
const serializedSignal = ThreadSignal.serialize(result);
await thread.imports.calculateResult(serializedSignal);

// In the target thread:

// Old API:
function calculateResult(resultThreadSignal) {
  const result = acceptThreadSignal(resultThreadSignal);
  const computedSignal = computed(() => `Result from thread: ${result.value}`);
  // ...
}

// New API:
function calculateResult(resultThreadSignal) {
  const result = new ThreadSignal(resultThreadSignal);
  const computedSignal = computed(() => `Result from thread: ${result.value}`);
  // ...
}
```

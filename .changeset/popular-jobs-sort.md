---
'@quilted/threads': major
'@quilted/preact-workers': minor
'@quilted/workers': minor
'@quilted/quilt': minor
---

Refactored the API for creating threads. The new APIs are class based, and now use module-style language to define the functions shared between threads: `exports` when creating a thread indicates the methods that can be called, and `imports` allows you to call those methods in the paired thread.

For example, you previously used `createThreadFromWebWorker()` to create a thread from a web worker. Now, you use the `ThreadWebWorker` class:

```js
// Old API:
import {createThreadFromWebWorker} from '@quilted/threads';

// Parent page
const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);
const result = await thread.doWork();

// Worker
createThreadFromWebWorker(self, {
  expose: {
    async doWork() {
      /* ... */
    },
  },
});

// ---
// New API:
import {ThreadWebWorker} from '@quilted/threads';

// Parent
const worker = new Worker('worker.js');
const thread = new ThreadWebWorker(worker);
const result = await thread.imports.doWork();

// Worker
new ThreadWebWorker(worker, {
  exports: {
    async doWork() {
      /* ... */
    },
  },
});
```

Additionally, the threads library now exports two additional helpers for turning web objects into threads: `ThreadWindow` and `ThreadNestedWindow`, which can be used to create a communication channel between a parent page and popup windows or tabs.

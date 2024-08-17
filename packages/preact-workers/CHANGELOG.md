# @quilted/preact-workers

## 0.2.0

### Minor Changes

- [#813](https://github.com/lemonmade/quilt/pull/813) [`40c2d71`](https://github.com/lemonmade/quilt/commit/40c2d71ec583c92266d2a7b5adec9cee8880b4ab) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactored the API for creating threads. The new APIs are class based, and now use module-style language to define the functions shared between threads: `exports` when creating a thread indicates the methods that can be called, and `imports` allows you to call those methods in the paired thread.

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

### Patch Changes

- Updated dependencies [[`40c2d71`](https://github.com/lemonmade/quilt/commit/40c2d71ec583c92266d2a7b5adec9cee8880b4ab)]:
  - @quilted/workers@0.5.0

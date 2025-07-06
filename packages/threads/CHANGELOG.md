# @quilted/threads

## 3.3.1

### Patch Changes

- [`664fa63`](https://github.com/lemonmade/quilt/commit/664fa639e7a73c9a3694da326ab6e3dde9fcb432) Thanks [@lemonmade](https://github.com/lemonmade)! - Add missing `ThreadWindow.from()` helper

## 3.3.0

### Minor Changes

- [`78147df`](https://github.com/lemonmade/quilt/commit/78147df626afbb8b54dbe809629c5cb3ac9052b5) Thanks [@lemonmade](https://github.com/lemonmade)! - Add nicer shorthands for nested thread contexts

## 3.2.0

### Minor Changes

- [`25278e0`](https://github.com/lemonmade/quilt/commit/25278e00643b18442621e29665b64ff3f56588af) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `import()` and `export()` static members to improve ergonomics of one-sided threads

## 3.1.3

### Patch Changes

- [`f098594`](https://github.com/lemonmade/quilt/commit/f0985948408fa592773548d201bf9bc7e2bcdeda) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signal dependencies

- Updated dependencies [[`f098594`](https://github.com/lemonmade/quilt/commit/f0985948408fa592773548d201bf9bc7e2bcdeda)]:
  - @quilted/events@2.1.3

## 3.1.2

### Patch Changes

- [`254b3ed`](https://github.com/lemonmade/quilt/commit/254b3ed1f419e2e9431e50861fede36333bf719e) Thanks [@lemonmade](https://github.com/lemonmade)! - More `ThreadSignal` fixes

## 3.1.1

### Patch Changes

- [`574b5d6`](https://github.com/lemonmade/quilt/commit/574b5d62c63a2b4505f9e8f192283382fbc9fd37) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `ThreadSignal` initialization

## 3.1.0

### Minor Changes

- [`f2463ec`](https://github.com/lemonmade/quilt/commit/f2463ec87c1af107fcfa0f307765912c9f86e29b) Thanks [@lemonmade](https://github.com/lemonmade)! - Add custom `serialize` and `deserialize` options to both thread serialization implementations

- [`b5ca2bd`](https://github.com/lemonmade/quilt/commit/b5ca2bd058f650509f062c609b5a49a39e0b4823) Thanks [@lemonmade](https://github.com/lemonmade)! - Add methods to check for `ThreadSignal` and `ThreadAbortSignal`

## 3.0.0

### Major Changes

- [#816](https://github.com/lemonmade/quilt/pull/816) [`ecd7322`](https://github.com/lemonmade/quilt/commit/ecd7322637e54b5f34dfa310249d819e944c9171) Thanks [@lemonmade](https://github.com/lemonmade)! - Changed `ThreadAbortSignal` utilities to be class-based instead of being a collection of utility functions. This change aligns the API more closely with `AbortController` in the browser, which is created with `new AbortController()`.

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

- [#818](https://github.com/lemonmade/quilt/pull/818) [`8669216`](https://github.com/lemonmade/quilt/commit/8669216a28c6d8b5b62d4f297ece8f44b8f9f3ae) Thanks [@lemonmade](https://github.com/lemonmade)! - Changed Preact thread utilities to be class-based instead of being a collection of utility functions.

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
    const computedSignal = computed(
      () => `Result from thread: ${result.value}`,
    );
    // ...
  }

  // New API:
  function calculateResult(resultThreadSignal) {
    const result = new ThreadSignal(resultThreadSignal);
    const computedSignal = computed(
      () => `Result from thread: ${result.value}`,
    );
    // ...
  }
  ```

### Patch Changes

- Updated dependencies [[`8669216`](https://github.com/lemonmade/quilt/commit/8669216a28c6d8b5b62d4f297ece8f44b8f9f3ae)]:
  - @quilted/events@2.1.1

## 2.4.0

### Minor Changes

- [`004395d`](https://github.com/lemonmade/quilt/commit/004395de11b0f1ebd0afd0d66c845e619ab92ab0) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for serializing unsigned integer arrays

## 2.3.0

### Minor Changes

- [`03d2cbb`](https://github.com/lemonmade/quilt/commit/03d2cbba9f099b0c207faa883980cf2a24b77aad) Thanks [@lemonmade](https://github.com/lemonmade)! - Add utilities for creating threads from service workers

## 2.2.0

### Minor Changes

- [`8477c13`](https://github.com/lemonmade/quilt/commit/8477c1398b03311c76886e037851b10bf77b9fba) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `markAsTransferable` to define values to transfer across threads

## 2.1.2

### Patch Changes

- [`ccf29286`](https://github.com/lemonmade/quilt/commit/ccf2928633719c38b30cd3712fe132c6bd5fd2a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade Preact and signal dependencies

## 2.1.1

### Patch Changes

- [`3a573a8d`](https://github.com/lemonmade/quilt/commit/3a573a8db9978749323691eadae530397ed606f5) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify thread helper types

- [`79ff7af7`](https://github.com/lemonmade/quilt/commit/79ff7af7cc4e594a86efc0302f1ddfdc309fdb65) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up type casting during thread creation

## 2.1.0

### Minor Changes

- [`e3789679`](https://github.com/lemonmade/quilt/commit/e3789679d5de2f4e5e48902c902032febee1efac) Thanks [@lemonmade](https://github.com/lemonmade)! - Add utility to turn `BroadcastChannel` objects into threads

## 2.0.0

### Major Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

### Patch Changes

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/events@2.0.0

## 1.0.3

### Patch Changes

- [`a9279252`](https://github.com/lemonmade/quilt/commit/a9279252d933f1cb41132acc84ca5dd4fe73307a) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signal dependencies

## 1.0.2

### Patch Changes

- [`10f361dd`](https://github.com/lemonmade/quilt/commit/10f361dd60d85e5dbb2ccbfc16b3a88c55bc83ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix function serialization

## 1.0.1

### Patch Changes

- [`c3f3298b`](https://github.com/lemonmade/quilt/commit/c3f3298b4458d939c0bfc7b83fe6ce120f4fbde8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing `isThreadSignal()` utility

- [`0366b6c7`](https://github.com/lemonmade/quilt/commit/0366b6c7bc321054325d036199e75fa7222913de) Thanks [@lemonmade](https://github.com/lemonmade)! - Add back encoding overrides feature

## 1.0.0

### Major Changes

- [#588](https://github.com/lemonmade/quilt/pull/588) [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up threads for a first version

### Patch Changes

- [`00d90d10`](https://github.com/lemonmade/quilt/commit/00d90d10f4eb97fe55712adcc8b34aa3d3ec1aa1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signals dependency and add dedicated package for signal utilities

- [#587](https://github.com/lemonmade/quilt/pull/587) [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2) Thanks [@lemonmade](https://github.com/lemonmade)! - First major version for `@quilted/events`

- [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify thread creation and add helpers for transferring signals over threads

- Updated dependencies [[`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2)]:
  - @quilted/events@1.0.0

## 0.1.15

### Patch Changes

- [`54e3db19`](https://github.com/lemonmade/quilt/commit/54e3db19094207d5eb5a073cfdbe98cb9ca68372) Thanks [@lemonmade](https://github.com/lemonmade)! - Encode more native JS types

## 0.1.14

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.1.13

### Patch Changes

- [`4e871d12`](https://github.com/lemonmade/quilt/commit/4e871d1235847dc472f5aab59412761d57fdeea1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix outer iframe target helper

## 0.1.12

### Patch Changes

- [`c4fbe548`](https://github.com/lemonmade/quilt/commit/c4fbe548d8f2bfd568ee21797896026148a3e37d) Thanks [@lemonmade](https://github.com/lemonmade)! - Add thread target utilities for iframes

## 0.1.11

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.1.10

### Patch Changes

- [`8afad785`](https://github.com/lemonmade/quilt/commit/8afad7855d8f8f7d9ca8f9caaa8cbfd79a6432d0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve self-referencing detection in threads

* [`9df5024d`](https://github.com/lemonmade/quilt/commit/9df5024d1594fcdc16d51c8bbb1ae7f26026ae43) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix custom encoders and decoders returning falsy values

## 0.1.9

### Patch Changes

- [`df9713c5`](https://github.com/lemonmade/quilt/commit/df9713c5b296b439c5947595f47e41448b5c8282) Thanks [@lemonmade](https://github.com/lemonmade)! - Add self-referencing detection to encoder

## 0.1.8

### Patch Changes

- [`86587484`](https://github.com/lemonmade/quilt/commit/86587484846906e194bba956bbd338aa00544625) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic encoder overrides

## 0.1.7

### Patch Changes

- [`163db45f`](https://github.com/lemonmade/quilt/commit/163db45f7a398a66d4ac0bac0dc5e6c3b3a62144) Thanks [@lemonmade](https://github.com/lemonmade)! - Add custom encoding method

## 0.1.6

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.1.5

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.1.4

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.1.3

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.1.2

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.1.1

### Patch Changes

- [#304](https://github.com/lemonmade/quilt/pull/304) [`c9b75e02`](https://github.com/lemonmade/quilt/commit/c9b75e02285fe6489f7a8e8b3e09d6815b918416) Thanks [@lemonmade](https://github.com/lemonmade)! - Add events and threads packages

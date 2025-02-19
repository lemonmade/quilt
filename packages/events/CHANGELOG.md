# @quilted/events

## 2.1.3

### Patch Changes

- [`f098594`](https://github.com/lemonmade/quilt/commit/f0985948408fa592773548d201bf9bc7e2bcdeda) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signal dependencies

## 2.1.2

### Patch Changes

- [`3fe12c7`](https://github.com/lemonmade/quilt/commit/3fe12c79055882debdbcacf44da90f99d82cfef1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixes for modern types

## 2.1.1

### Patch Changes

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

## 2.1.0

### Minor Changes

- [`bbfd7c2`](https://github.com/lemonmade/quilt/commit/bbfd7c27ab2db3363af441f8e029f0a8bd53455e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `EventTargetSignal` class for converting an `EventTarget` into a Preact signal

## 2.0.0

### Major Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

## 1.0.1

### Patch Changes

- [`2bbcef8e`](https://github.com/lemonmade/quilt/commit/2bbcef8e69d2f228a0d23e43acb4f89130e2bbd9) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix type of EventEmitter.internal

## 1.0.0

### Major Changes

- [#587](https://github.com/lemonmade/quilt/pull/587) [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2) Thanks [@lemonmade](https://github.com/lemonmade)! - First major version for `@quilted/events`

## 0.1.18

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.1.17

### Patch Changes

- [#516](https://github.com/lemonmade/quilt/pull/516) [`575d9033`](https://github.com/lemonmade/quilt/commit/575d9033cfafa438b2998c6fea7e00a307ef0be7) Thanks [@lemonmade](https://github.com/lemonmade)! - Add timeout event helpers

## 0.1.16

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.1.15

### Patch Changes

- [#429](https://github.com/lemonmade/quilt/pull/429) [`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7) Thanks [@lemonmade](https://github.com/lemonmade)! - Update all development dependencies to their latest versions

## 0.1.14

### Patch Changes

- [`fc34575a`](https://github.com/lemonmade/quilt/commit/fc34575a565760c352d7417dc26bfc989828acdd) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix types for emitter once events

## 0.1.13

### Patch Changes

- [`2128fbe4`](https://github.com/lemonmade/quilt/commit/2128fbe469abc5589544d59317577cdc4f876353) Thanks [@lemonmade](https://github.com/lemonmade)! - Add raceAgainstAbortSignal utility

## 0.1.12

### Patch Changes

- [`73c73555`](https://github.com/lemonmade/quilt/commit/73c735555b8feaaf19f7355fab87a4021925d099) Thanks [@lemonmade](https://github.com/lemonmade)! - Add reason to anyAbortController

## 0.1.11

### Patch Changes

- [`39544227`](https://github.com/lemonmade/quilt/commit/39544227abefed9185b500e3461ad4ec2e5f11cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Add anyAbortSignal utility

## 0.1.10

### Patch Changes

- [`a419953a`](https://github.com/lemonmade/quilt/commit/a419953aff8c955aa8ca7ef2923869f051c3f24d) Thanks [@lemonmade](https://github.com/lemonmade)! - Add internal events for emitter

## 0.1.9

### Patch Changes

- [`ee630a83`](https://github.com/lemonmade/quilt/commit/ee630a832b2582a71398a720a2b0ac990eae027d) Thanks [@lemonmade](https://github.com/lemonmade)! - Export addListener utility

## 0.1.8

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.1.7

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.1.6

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.1.5

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.1.4

### Patch Changes

- [#338](https://github.com/lemonmade/quilt/pull/338) [`3e2993f5`](https://github.com/lemonmade/quilt/commit/3e2993f598be4aad1b16ef378d7cd449de81c3b5) Thanks [@lemonmade](https://github.com/lemonmade)! - Add full support for from-source export condition

## 0.1.3

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.1.2

### Patch Changes

- [`f88502ca`](https://github.com/lemonmade/quilt/commit/f88502ca8c969d0da0991523cb1326c9fd6d2203) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some events types and exports

## 0.1.1

### Patch Changes

- [#304](https://github.com/lemonmade/quilt/pull/304) [`c9b75e02`](https://github.com/lemonmade/quilt/commit/c9b75e02285fe6489f7a8e8b3e09d6815b918416) Thanks [@lemonmade](https://github.com/lemonmade)! - Add events and threads packages

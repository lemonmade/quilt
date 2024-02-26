# @quilted/threads

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

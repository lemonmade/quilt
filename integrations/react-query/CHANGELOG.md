# @quilted/react-query

## 1.0.0

### Patch Changes

- Updated dependencies [[`ecd7322`](https://github.com/lemonmade/quilt/commit/ecd7322637e54b5f34dfa310249d819e944c9171), [`40c2d71`](https://github.com/lemonmade/quilt/commit/40c2d71ec583c92266d2a7b5adec9cee8880b4ab), [`8669216`](https://github.com/lemonmade/quilt/commit/8669216a28c6d8b5b62d4f297ece8f44b8f9f3ae)]:
  - @quilted/quilt@0.8.0

## 0.4.2

### Patch Changes

- [`8d12d8e`](https://github.com/lemonmade/quilt/commit/8d12d8e0eb997f9631136f15d228501eaef9646d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `ReactQueryContext` causing its children unnecessarily to re-render during SSR

- [`b2020f7`](https://github.com/lemonmade/quilt/commit/b2020f74e07f01f259f59a0a8fa20d51c15a5449) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix serialization in edge cases where scripts load before DOMContentLoaded

- Updated dependencies [[`b2020f7`](https://github.com/lemonmade/quilt/commit/b2020f74e07f01f259f59a0a8fa20d51c15a5449)]:
  - @quilted/quilt@0.7.3

## 0.4.1

### Patch Changes

- [`adbbb82`](https://github.com/lemonmade/quilt/commit/adbbb82ddb6b45566ddc6a64240db2dbccff3eef) Thanks [@lemonmade](https://github.com/lemonmade)! - Add useLazyGraphQLQuery hook

## 0.4.0

### Minor Changes

- [`87598dc`](https://github.com/lemonmade/quilt/commit/87598dcca4d97835caed7152f646e9989c75d73b) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to more explicit Preact dependencies

### Patch Changes

- Updated dependencies [[`87598dc`](https://github.com/lemonmade/quilt/commit/87598dcca4d97835caed7152f646e9989c75d73b)]:
  - @quilted/quilt@0.7.0

## 0.3.2

### Patch Changes

- [#716](https://github.com/lemonmade/quilt/pull/716) [`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor browser APIs

- Updated dependencies [[`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be)]:
  - @quilted/quilt@0.6.15

## 0.3.1

### Patch Changes

- [`b125fa4c`](https://github.com/lemonmade/quilt/commit/b125fa4c2b0d76ceb68d76ca50894f984cec5d07) Thanks [@lemonmade](https://github.com/lemonmade)! - Don’t require React Query keys for GraphQL wrappers

## 0.3.0

### Minor Changes

- [`c64ec21f`](https://github.com/lemonmade/quilt/commit/c64ec21f890af28c573b4a98bc07f4a0623e969d) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TanStack Query dependencies

### Patch Changes

- Updated dependencies [[`e407aec5`](https://github.com/lemonmade/quilt/commit/e407aec56e697eadfc7b1e62168ad40a49738d96)]:
  - @quilted/quilt@0.6.1

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

### Patch Changes

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/useful-types@2.0.0
  - @quilted/quilt@0.6.0

## 0.1.21

### Patch Changes

- [`d386f51a`](https://github.com/lemonmade/quilt/commit/d386f51a6185a8fdc5523f9fb4a24e2f3d1ed011) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve cache key for react-query GraphQL hooks

## 0.1.20

### Patch Changes

- [`da6a0767`](https://github.com/lemonmade/quilt/commit/da6a0767653eb32980036d244160c721a96265ed) Thanks [@lemonmade](https://github.com/lemonmade)! - Thread signal through `useGraphQLQuery`

- Updated dependencies [[`8fa1a6bd`](https://github.com/lemonmade/quilt/commit/8fa1a6bd67d3112ae0054f6fff531889f762cd52)]:
  - @quilted/craft@0.1.219
  - @quilted/quilt@0.5.145

## 0.1.19

### Patch Changes

- [`59f67964`](https://github.com/lemonmade/quilt/commit/59f67964d5751df84b3150fd1e2a6e00b85f52e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix type errors from new GraphQL types

- Updated dependencies [[`59f67964`](https://github.com/lemonmade/quilt/commit/59f67964d5751df84b3150fd1e2a6e00b85f52e8)]:
  - @quilted/craft@0.1.218

## 0.1.18

### Patch Changes

- [#571](https://github.com/lemonmade/quilt/pull/571) [`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up GraphQL library for a V1

- Updated dependencies [[`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb), [`9122cbbc`](https://github.com/lemonmade/quilt/commit/9122cbbce965bf5b432027e0707b2d619857fa67)]:
  - @quilted/quilt@0.5.144
  - @quilted/useful-types@1.0.0
  - @quilted/craft@0.1.217

## 0.1.17

### Patch Changes

- [`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies and fix some missing peer dependencies

- Updated dependencies [[`95a58eb6`](https://github.com/lemonmade/quilt/commit/95a58eb63edebe27301d18d58b37fe76e95b01c4), [`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3)]:
  - @quilted/craft@0.1.201
  - @quilted/quilt@0.5.140

## 0.1.16

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

- Updated dependencies [[`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1)]:
  - @quilted/craft@0.1.198
  - @quilted/quilt@0.5.139

## 0.1.15

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

- Updated dependencies [[`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474), [`50215b7c`](https://github.com/lemonmade/quilt/commit/50215b7c005c21440bca04935fda87d98d9d9d01), [`dce549a1`](https://github.com/lemonmade/quilt/commit/dce549a19f296e3b20b70cff8da46fca517dda79)]:
  - @quilted/craft@0.1.176
  - @quilted/quilt@0.5.125

## 0.1.14

### Patch Changes

- [#475](https://github.com/lemonmade/quilt/pull/475) [`de6bb615`](https://github.com/lemonmade/quilt/commit/de6bb615c1cdb763f9116e0649b21d6c46aaf9a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to React 18

- Updated dependencies [[`de6bb615`](https://github.com/lemonmade/quilt/commit/de6bb615c1cdb763f9116e0649b21d6c46aaf9a4)]:
  - @quilted/quilt@0.5.124

## 0.1.13

### Patch Changes

- [#474](https://github.com/lemonmade/quilt/pull/474) [`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04) Thanks [@lemonmade](https://github.com/lemonmade)! - Looser React version restrictions

- [`686d5b92`](https://github.com/lemonmade/quilt/commit/686d5b92d5f35bb2946b8b2d0696fda7c3b88294) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix detecting disabled queries in react-query

- Updated dependencies [[`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04), [`e647289c`](https://github.com/lemonmade/quilt/commit/e647289c14a2bf8d0d9d322cd3fe1be3f675c535)]:
  - @quilted/craft@0.1.174
  - @quilted/quilt@0.5.123

## 0.1.12

### Patch Changes

- [`f4724c41`](https://github.com/lemonmade/quilt/commit/f4724c41995f068fe5c842b2a98749cf39292b35) Thanks [@lemonmade](https://github.com/lemonmade)! - Update react-query versions

- Updated dependencies [[`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7)]:
  - @quilted/craft@0.1.162

## 0.1.11

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

- Updated dependencies [[`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471)]:
  - @quilted/craft@0.1.140
  - @quilted/quilt@0.5.108

## 0.1.10

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

- Updated dependencies [[`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e)]:
  - @quilted/craft@0.1.139
  - @quilted/quilt@0.5.107

## 0.1.9

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

- Updated dependencies [[`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48)]:
  - @quilted/craft@0.1.138
  - @quilted/quilt@0.5.106

## 0.1.8

### Patch Changes

- [`8fdaece1`](https://github.com/lemonmade/quilt/commit/8fdaece1a270e109b3e874267c7387bd977b0706) Thanks [@lemonmade](https://github.com/lemonmade)! - Match React versions

- Updated dependencies [[`af598b0e`](https://github.com/lemonmade/quilt/commit/af598b0ebe7962bde1423ef54339f3ae5b6b29bf)]:
  - @quilted/craft@0.1.124

## 0.1.7

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

- Updated dependencies [[`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b)]:
  - @quilted/craft@0.1.121
  - @quilted/quilt@0.5.102

## 0.1.6

### Patch Changes

- [#298](https://github.com/lemonmade/quilt/pull/298) [`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQL libraries

- Updated dependencies [[`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6)]:
  - @quilted/quilt@0.5.93
  - @quilted/craft@0.1.110

## 0.1.5

### Patch Changes

- [`49e7919d`](https://github.com/lemonmade/quilt/commit/49e7919dce72edf9cb1483cfdfe8880c4b49d1fd) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix react-query craft integration

## 0.1.4

### Patch Changes

- [`dd65553f`](https://github.com/lemonmade/quilt/commit/dd65553fdda06254e95f6e0aa9b26dbca951676f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query craft plugin

* [`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL fetch naming and type exports

* Updated dependencies [[`dd65553f`](https://github.com/lemonmade/quilt/commit/dd65553fdda06254e95f6e0aa9b26dbca951676f), [`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0)]:
  - @quilted/craft@0.1.97
  - @quilted/quilt@0.5.79

## 0.1.3

### Patch Changes

- [`85508931`](https://github.com/lemonmade/quilt/commit/8550893132d4bd5a8f759eeedec3067b740cccdb) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix options type for react-query GraphQL hooks

## 0.1.2

### Patch Changes

- [#241](https://github.com/lemonmade/quilt/pull/241) [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query GraphQL hooks

- Updated dependencies [[`eb9f7d42`](https://github.com/lemonmade/quilt/commit/eb9f7d4271010a8edfd683d825e9d49cb8969c8e), [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8)]:
  - @quilted/quilt@0.5.78

## 0.1.1

### Patch Changes

- [`68f109fb`](https://github.com/lemonmade/quilt/commit/68f109fb8ba73e30d52be5265cdab335ff4730e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix react-query build

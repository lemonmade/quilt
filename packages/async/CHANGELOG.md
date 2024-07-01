# @quilted/async

## 0.4.17

### Patch Changes

- [`858db16`](https://github.com/lemonmade/quilt/commit/858db164ea8d1d84d2cf112797405840deb0f4f2) Thanks [@lemonmade](https://github.com/lemonmade)! - Round cache time for async actions

## 0.4.16

### Patch Changes

- [`0d11757`](https://github.com/lemonmade/quilt/commit/0d11757b12c70f77ae49571ec851fda4dc01a517) Thanks [@lemonmade](https://github.com/lemonmade)! - Make yielded values trigger `value` subscribers

## 0.4.15

### Patch Changes

- [`7faeb6a`](https://github.com/lemonmade/quilt/commit/7faeb6a4152f072b7d25a0da7aa498af380b8227) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `force` option to `AsyncActionCache.run()`

## 0.4.14

### Patch Changes

- [`442f69a`](https://github.com/lemonmade/quilt/commit/442f69a701897aeef40cb1eb2460b0551e4586c9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add a count of active query watchers

- [`1d1e03a`](https://github.com/lemonmade/quilt/commit/1d1e03a07955a2312a29398382f66db87577fb6e) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve `AsyncAction.run()` retry semantics, and add `force` option for forcibly re-running an action

## 0.4.13

### Patch Changes

- [`df94c4d`](https://github.com/lemonmade/quilt/commit/df94c4dcd79a73c8d71ef11a7edb36b547f139a3) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix async timing issues and added `useAsyncRetry()`

## 0.4.12

### Patch Changes

- [`8c24286`](https://github.com/lemonmade/quilt/commit/8c24286a01a90c90987b9def81060b3537e52e77) Thanks [@lemonmade](https://github.com/lemonmade)! - Add method to check changes to `AsyncAction` input

- [`a3ccf09`](https://github.com/lemonmade/quilt/commit/a3ccf09dd02620985a33d850dfa28d3e817a4b20) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix privacy of some `AsyncAction` internals

## 0.4.11

### Patch Changes

- [`58fea38`](https://github.com/lemonmade/quilt/commit/58fea38bbe5e999cb8742ac00cfaad04332507e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add hooks for GraphQL queries and mutations

## 0.4.10

### Patch Changes

- [`5db01f8`](https://github.com/lemonmade/quilt/commit/5db01f8a8dce398a8ab02e40dba2b1f63840faf1) Thanks [@lemonmade](https://github.com/lemonmade)! - More fixes to async timing and cancellation

## 0.4.9

### Patch Changes

- [`ffa4d65`](https://github.com/lemonmade/quilt/commit/ffa4d6526892cadde17c1512b11537c907563bc5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `useAsync()` reactivity to option changes

- [`76504f1`](https://github.com/lemonmade/quilt/commit/76504f1058a1bdcf037499c36e648eee7fb6bc9d) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename `AsyncFetch` to `AsyncAction` and add `useAsyncMutation`

- [`51407f5`](https://github.com/lemonmade/quilt/commit/51407f5e3495d34a77b58ce897d850b8756cdfbe) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for yielding intermediate values in an async action

- [`f62bbaf`](https://github.com/lemonmade/quilt/commit/f62bbaf0017917101c8e48471fdde09202d60c61) Thanks [@lemonmade](https://github.com/lemonmade)! - Replace `AsyncActionRun.function` with `AsyncActionRun.action`

## 0.4.8

### Patch Changes

- [`e991b05`](https://github.com/lemonmade/quilt/commit/e991b05d98ded75993b6b777fa715737af106220) Thanks [@lemonmade](https://github.com/lemonmade)! - Update `fulfilled` status to `resolved`

- Updated dependencies [[`0bcb1b7`](https://github.com/lemonmade/quilt/commit/0bcb1b7ccc37e4768f242b2d343f5fd0134c1573)]:
  - @quilted/signals@0.2.2

## 0.4.7

### Patch Changes

- [`70b457c`](https://github.com/lemonmade/quilt/commit/70b457cc889e7fcb70d7ec397800b249dcc8a51f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add more timing information to `AsyncFetch`

- [`5ab45f2`](https://github.com/lemonmade/quilt/commit/5ab45f2650adc6278b4fba464b78445f753eea9e) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename `AsyncFetch.call()` to `AsyncFetch.fetch()`

- [`518de8a`](https://github.com/lemonmade/quilt/commit/518de8afb223d8b6c28294a2e28f3b042ae953a6) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `AsyncFetchCache.delete()` and `AsyncFetchCache.clear()` for cache pruning

- [`ed9ecdd`](https://github.com/lemonmade/quilt/commit/ed9ecdd8fa28d9c0505cb108c0c20fbe21968817) Thanks [@lemonmade](https://github.com/lemonmade)! - Add serialization of `finishedAt` time

- [`762ac2d`](https://github.com/lemonmade/quilt/commit/762ac2d94c7390149d1c60d8d40a7352532cdaa4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `AsyncFetch.refetch()` method

## 0.4.6

### Patch Changes

- [`31e1775`](https://github.com/lemonmade/quilt/commit/31e1775f06e6be1ecdb9da53ba27f5528ba327d1) Thanks [@lemonmade](https://github.com/lemonmade)! - More async API type fixes

## 0.4.5

### Patch Changes

- [`c813ecc`](https://github.com/lemonmade/quilt/commit/c813ecc6abe867849d3787e84fd284b731db3402) Thanks [@lemonmade](https://github.com/lemonmade)! - More async fetch improvements

- [`36b52ad`](https://github.com/lemonmade/quilt/commit/36b52ad6ea0dd4f9fb56110315e884a434c499f0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve `AsyncFetchCache`

## 0.4.4

### Patch Changes

- [`28dd615`](https://github.com/lemonmade/quilt/commit/28dd615c944426e34a3649c61b554e0ba1a66da1) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve `AsyncFetch` state management

## 0.4.3

### Patch Changes

- [`7e93120`](https://github.com/lemonmade/quilt/commit/7e93120bce62050315d7eaa3c3efc28d4d1764a3) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up async fetch cache results

- [`92de8b4`](https://github.com/lemonmade/quilt/commit/92de8b4df478731ae46bb4a39e12818c0391fe24) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `AsyncModule` initial value

## 0.4.2

### Patch Changes

- [#732](https://github.com/lemonmade/quilt/pull/732) [`5d5b90b`](https://github.com/lemonmade/quilt/commit/5d5b90bd62d887ec90198702e81696fa93555281) Thanks [@lemonmade](https://github.com/lemonmade)! - Introduce a more powerful `AsyncFetch` primitive, `AsyncFetchCache` for caching results, and `useAsync` hook for component-level data fetching.

## 0.4.1

### Patch Changes

- [#699](https://github.com/lemonmade/quilt/pull/699) [`8335c47`](https://github.com/lemonmade/quilt/commit/8335c47fa1896ad65d5cd218fe068f22627815d9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `AsyncOperation` type for observable async operations

- [#699](https://github.com/lemonmade/quilt/pull/699) [`8335c47`](https://github.com/lemonmade/quilt/commit/8335c47fa1896ad65d5cd218fe068f22627815d9) Thanks [@lemonmade](https://github.com/lemonmade)! - Update async APIs

## 0.4.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

### Patch Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Add dedicated Babel package

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/events@2.0.0
  - @quilted/assets@0.1.0

## 0.3.46

### Patch Changes

- Updated dependencies [[`750dd6b9`](https://github.com/lemonmade/quilt/commit/750dd6b9cb6a18648cc793f57579fb0b64cb23bc)]:
  - @quilted/assets@0.0.5

## 0.3.45

### Patch Changes

- Updated dependencies [[`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f)]:
  - @quilted/assets@0.0.4

## 0.3.44

### Patch Changes

- [`fa75574c`](https://github.com/lemonmade/quilt/commit/fa75574c8697726f70321e43c2d2d554ea674926) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix loading CSS files for async modules

## 0.3.43

### Patch Changes

- [#587](https://github.com/lemonmade/quilt/pull/587) [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2) Thanks [@lemonmade](https://github.com/lemonmade)! - First major version for `@quilted/events`

- Updated dependencies [[`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2)]:
  - @quilted/events@1.0.0

## 0.3.42

### Patch Changes

- [#582](https://github.com/lemonmade/quilt/pull/582) [`6dca6fcf`](https://github.com/lemonmade/quilt/commit/6dca6fcf62fbed7600400b619e5509c7d7f7fb45) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow async module global to be lazy initialized

## 0.3.41

### Patch Changes

- [`1335ce47`](https://github.com/lemonmade/quilt/commit/1335ce47fb86ae628a421a22c22c794d94a307ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript

- [`345e40b7`](https://github.com/lemonmade/quilt/commit/345e40b73bbc95e23b6d2ecf822b2ea2a705363a) Thanks [@lemonmade](https://github.com/lemonmade)! - Update build dependencies

- [`039d6572`](https://github.com/lemonmade/quilt/commit/039d6572ffe0a16054fa52c67261fe163407c3df) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Babel dependencies

## 0.3.40

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

- Updated dependencies [[`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1)]:
  - @quilted/assets@0.0.3

## 0.3.39

### Patch Changes

- [#532](https://github.com/lemonmade/quilt/pull/532) [`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56) Thanks [@lemonmade](https://github.com/lemonmade)! - Move asset manifest code into asset packages

- Updated dependencies [[`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56)]:
  - @quilted/assets@0.0.2

## 0.3.38

### Patch Changes

- [#527](https://github.com/lemonmade/quilt/pull/527) [`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve asset manifests

- Updated dependencies [[`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac)]:
  - @quilted/assets@0.0.1

## 0.3.37

### Patch Changes

- [`40b334a4`](https://github.com/lemonmade/quilt/commit/40b334a4ec3bcebc2568134bbb1e1286754df8cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Nicer identifiers for async entries

## 0.3.36

### Patch Changes

- [#508](https://github.com/lemonmade/quilt/pull/508) [`befb2aa9`](https://github.com/lemonmade/quilt/commit/befb2aa9d374aff66cbfe54fc8157522e3d3af21) Thanks [@lemonmade](https://github.com/lemonmade)! - Move logic out of HTML component

## 0.3.35

### Patch Changes

- [#504](https://github.com/lemonmade/quilt/pull/504) [`c3b95b5c`](https://github.com/lemonmade/quilt/commit/c3b95b5c17345394a99035bd43eee1e7440e6979) Thanks [@lemonmade](https://github.com/lemonmade)! - Use suspense by default for async components

## 0.3.34

### Patch Changes

- [`8945415d`](https://github.com/lemonmade/quilt/commit/8945415d8f196724e409a259cf319d9f09631ae2) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve some bundling defaults

## 0.3.33

### Patch Changes

- [`96b3a48b`](https://github.com/lemonmade/quilt/commit/96b3a48b649f86995f6d95ab1c85001b14bb4c67) Thanks [@lemonmade](https://github.com/lemonmade)! - Try fixing async style inclusion

## 0.3.32

### Patch Changes

- [#489](https://github.com/lemonmade/quilt/pull/489) [`c0dee75a`](https://github.com/lemonmade/quilt/commit/c0dee75aae600e882d419ee4e81b2c35d4772565) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix async loading in Vite

- [#489](https://github.com/lemonmade/quilt/pull/489) [`c0dee75a`](https://github.com/lemonmade/quilt/commit/c0dee75aae600e882d419ee4e81b2c35d4772565) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify async Babel/Rollup transforms

## 0.3.31

### Patch Changes

- [`55336251`](https://github.com/lemonmade/quilt/commit/5533625189999f06e5111a9acba14e001a9d847c) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up async APIs

## 0.3.30

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.3.29

### Patch Changes

- [`4755e44c`](https://github.com/lemonmade/quilt/commit/4755e44c4c0f7bd5519fed0aeb8428abd8c185f5) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify async prefetching markup

## 0.3.28

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.3.27

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.3.26

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.3.25

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.3.24

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.3.23

### Patch Changes

- [#283](https://github.com/lemonmade/quilt/pull/283) [`daf06328`](https://github.com/lemonmade/quilt/commit/daf06328f242ac621b70942aa063a6138a12f62f) Thanks [@lemonmade](https://github.com/lemonmade)! - Rework asset manifest

## 0.3.22

### Patch Changes

- [#228](https://github.com/lemonmade/quilt/pull/228) [`c7afc048`](https://github.com/lemonmade/quilt/commit/c7afc0486d37bc54da704c46cda1166690dda152) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade to stricter typescript options

## 0.3.21

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

## 0.3.20

### Patch Changes

- [`4474c4c3`](https://github.com/lemonmade/quilt/commit/4474c4c3a298c9782f4632e54218dc04acd22cca) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix DOM reference in async library

## 0.3.19

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

- Updated dependencies [[`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f)]:
  - @quilted/sewing-kit@0.2.23
  - @quilted/sewing-kit-babel@0.1.13
  - @quilted/sewing-kit-rollup@0.1.14

## 0.3.18

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

- Updated dependencies [[`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5)]:
  - @quilted/sewing-kit@0.2.22
  - @quilted/sewing-kit-babel@0.1.12
  - @quilted/sewing-kit-rollup@0.1.13

## 0.3.17

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

- Updated dependencies [[`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8)]:
  - @quilted/sewing-kit@0.2.20
  - @quilted/sewing-kit-babel@0.1.11
  - @quilted/sewing-kit-rollup@0.1.12

## 0.3.16

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

- Updated dependencies [[`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3)]:
  - @quilted/sewing-kit@0.2.19
  - @quilted/sewing-kit-babel@0.1.10
  - @quilted/sewing-kit-rollup@0.1.11

## 0.3.15

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

- Updated dependencies [[`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8)]:
  - @quilted/sewing-kit@0.2.18
  - @quilted/sewing-kit-babel@0.1.9
  - @quilted/sewing-kit-rollup@0.1.10

## 0.3.14

### Patch Changes

- [`a9d3eb2`](https://github.com/lemonmade/quilt/commit/a9d3eb268447b50bb4504584d568fd16df158265) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset manifest creation and types in strict package environments

* [`fbff206`](https://github.com/lemonmade/quilt/commit/fbff206228e2bf4a1a1e07beb63d04f5553b6cf1) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove @quilted/async transforms in development and test environments

* Updated dependencies [[`6ad3628`](https://github.com/lemonmade/quilt/commit/6ad362860eb65392ec5c5fa80c62e002e7f99f74)]:
  - @quilted/sewing-kit-rollup@0.1.9

## 0.3.13

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project

- Updated dependencies [[`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e)]:
  - @quilted/sewing-kit@0.2.14
  - @quilted/sewing-kit-babel@0.1.8
  - @quilted/sewing-kit-rollup@0.1.8

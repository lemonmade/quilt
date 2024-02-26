# @quilted/workers

## 0.4.2

### Patch Changes

- [`3a573a8d`](https://github.com/lemonmade/quilt/commit/3a573a8db9978749323691eadae530397ed606f5) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify thread helper types

## 0.4.1

### Patch Changes

- [`ceb1549f`](https://github.com/lemonmade/quilt/commit/ceb1549f81d7ab451cfacca53c6d6d9664e72e42) Thanks [@lemonmade](https://github.com/lemonmade)! - More development worker tweaks

## 0.4.0

### Minor Changes

- [`7b3e9a9a`](https://github.com/lemonmade/quilt/commit/7b3e9a9a4b63e76ec4224cccc9a8449b83c93a4d) Thanks [@lemonmade](https://github.com/lemonmade)! - Update worker factories to return actual `Worker` classes

## 0.3.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

### Patch Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Move worker tooling configuration

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Add dedicated Babel package

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/threads@2.0.0

## 0.2.36

### Patch Changes

- [#588](https://github.com/lemonmade/quilt/pull/588) [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up threads for a first version

- [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify thread creation and add helpers for transferring signals over threads

- Updated dependencies [[`00d90d10`](https://github.com/lemonmade/quilt/commit/00d90d10f4eb97fe55712adcc8b34aa3d3ec1aa1), [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d), [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2), [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb)]:
  - @quilted/threads@1.0.0

## 0.2.35

### Patch Changes

- [`1335ce47`](https://github.com/lemonmade/quilt/commit/1335ce47fb86ae628a421a22c22c794d94a307ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript

## 0.2.34

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.2.33

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.2.32

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.2.31

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.2.30

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.2.29

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.2.28

### Patch Changes

- [`af598b0e`](https://github.com/lemonmade/quilt/commit/af598b0ebe7962bde1423ef54339f3ae5b6b29bf) Thanks [@lemonmade](https://github.com/lemonmade)! - Move rollup plugins into craft

## 0.2.27

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.2.26

### Patch Changes

- [`4e2764c1`](https://github.com/lemonmade/quilt/commit/4e2764c1763c3aa30de10e694d7cf12ffb6748e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix workers module references

## 0.2.25

### Patch Changes

- [`1942470a`](https://github.com/lemonmade/quilt/commit/1942470aff9e18ea4499d15ee42727a4ddf24969) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix final worker build issues

## 0.2.24

### Patch Changes

- [`b197bb17`](https://github.com/lemonmade/quilt/commit/b197bb171c66cb4d51f9ecf97f29ddd6a808157d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix thread worker entry point

## 0.2.23

### Patch Changes

- [`94dcb682`](https://github.com/lemonmade/quilt/commit/94dcb68224e7076a08070c46b5e3c31e7568a970) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix worker build configuration

## 0.2.22

### Patch Changes

- [#304](https://github.com/lemonmade/quilt/pull/304) [`c9b75e02`](https://github.com/lemonmade/quilt/commit/c9b75e02285fe6489f7a8e8b3e09d6815b918416) Thanks [@lemonmade](https://github.com/lemonmade)! - Add events and threads packages

## 0.2.21

### Patch Changes

- [#228](https://github.com/lemonmade/quilt/pull/228) [`c7afc048`](https://github.com/lemonmade/quilt/commit/c7afc0486d37bc54da704c46cda1166690dda152) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade to stricter typescript options

## 0.2.20

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

## 0.2.19

### Patch Changes

- [`5bdbcf9c`](https://github.com/lemonmade/quilt/commit/5bdbcf9c298d653dafca4996a5c28ff48829ed4e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix package resolution for workers package

- Updated dependencies [[`06f0aa87`](https://github.com/lemonmade/quilt/commit/06f0aa872f3cd9320b8f84528fa5cc0fa98eb685)]:
  - @quilted/sewing-kit-rollup@0.1.15

## 0.2.18

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

- Updated dependencies [[`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f)]:
  - @quilted/sewing-kit@0.2.23
  - @quilted/sewing-kit-babel@0.1.13
  - @quilted/sewing-kit-rollup@0.1.14
  - @quilted/sewing-kit-vite@0.1.11

## 0.2.17

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

- Updated dependencies [[`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5)]:
  - @quilted/sewing-kit@0.2.22
  - @quilted/sewing-kit-babel@0.1.12
  - @quilted/sewing-kit-rollup@0.1.13
  - @quilted/sewing-kit-vite@0.1.10

## 0.2.16

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

- Updated dependencies [[`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8)]:
  - @quilted/sewing-kit@0.2.20
  - @quilted/sewing-kit-babel@0.1.11
  - @quilted/sewing-kit-rollup@0.1.12
  - @quilted/sewing-kit-vite@0.1.9

## 0.2.15

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

- Updated dependencies [[`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3)]:
  - @quilted/sewing-kit@0.2.19
  - @quilted/sewing-kit-babel@0.1.10
  - @quilted/sewing-kit-rollup@0.1.11
  - @quilted/sewing-kit-vite@0.1.8

## 0.2.14

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

- Updated dependencies [[`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8)]:
  - @quilted/sewing-kit@0.2.18
  - @quilted/sewing-kit-babel@0.1.9
  - @quilted/sewing-kit-rollup@0.1.10
  - @quilted/sewing-kit-vite@0.1.7

## 0.2.13

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project

- Updated dependencies [[`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e)]:
  - @quilted/sewing-kit@0.2.14
  - @quilted/sewing-kit-babel@0.1.8
  - @quilted/sewing-kit-rollup@0.1.8
  - @quilted/sewing-kit-vite@0.1.3

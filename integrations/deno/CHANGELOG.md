# @quilted/deno

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor `@quilted/craft` to be just a thin layer over Rollup and Vite

### Patch Changes

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/quilt@0.6.0

## 0.1.2

### Patch Changes

- [#612](https://github.com/lemonmade/quilt/pull/612) [`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app template APIs

- Updated dependencies [[`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f)]:
  - @quilted/craft@0.1.233
  - @quilted/quilt@0.5.153

## 0.1.1

### Patch Changes

- [`788c606b`](https://github.com/lemonmade/quilt/commit/788c606b4993cf8136d5743600a4ba52143d6738) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix name of request router export in deno plugin

- Updated dependencies []:
  - @quilted/craft@0.1.231

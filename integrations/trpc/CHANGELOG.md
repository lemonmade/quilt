# @quilted/trpc

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

## 0.1.1

### Patch Changes

- [`67dc06e8`](https://github.com/lemonmade/quilt/commit/67dc06e8a680c3d35f08b721ae717e3643add4a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Make client options optional

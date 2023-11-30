# @quilted/create-app

## 0.2.2

### Patch Changes

- [`73a867bd`](https://github.com/lemonmade/quilt/commit/73a867bda7ed521b14457ae8fb0d8e7765aaffb1) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove ESLint configuration from templates

## 0.2.1

### Patch Changes

- [`406d8152`](https://github.com/lemonmade/quilt/commit/406d81525a417eb9dadb8425b482eb03355387d8) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove stylelint and browserlist packages

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

### Patch Changes

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/cli-kit@0.2.0
  - @quilted/create@0.2.0

## 0.1.1

### Patch Changes

- [`c4972e7b`](https://github.com/lemonmade/quilt/commit/c4972e7beb8bee6680798d30c2deedf6a4ec795a) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix bundling of @quilted/create-app

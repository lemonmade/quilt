---
'@quilted/rollup': patch
'@quilted/vite': patch
'@quilted/browser': patch
'@quilted/create': patch
'@quilted/cli-kit': patch
---

Raise dependency range floors onto patched versions.

These ranges already permitted a fixed version, so a consumer with a fresh
lockfile was fine — but one with an older resolution stayed on a vulnerable copy
with nothing in the manifest to stop it. Raising the floor makes the patched
version the worst case a consumer can resolve rather than the best case:

- `@quilted/rollup`: `glob` to `^10.5.0`, `@babel/core` to `^7.29.7`
- `@quilted/vite`: `@babel/core` to `^7.29.7`
- `@quilted/browser`: `js-cookie` to `^3.0.8`
- `@quilted/create`: `minimatch` to `^5.1.9`, `yaml` to `^2.9.0`
- `@quilted/cli-kit`: `glob` to `^8.1.0`

The `glob` floor also lifts the `minimatch` / `brace-expansion` / `picomatch`
chain that sits underneath it, which accounted for most of the high-severity
advisories reaching downstream consumers.

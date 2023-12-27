# @quilted/craft

## 0.2.5

### Patch Changes

- [#680](https://github.com/lemonmade/quilt/pull/680) [`b5e95c5f`](https://github.com/lemonmade/quilt/commit/b5e95c5f512737741137a5babc07ca6114524294) Thanks [@lemonmade](https://github.com/lemonmade)! - Update vite and vitest dependencies

## 0.2.4

### Patch Changes

- [`e5da8c12`](https://github.com/lemonmade/quilt/commit/e5da8c12d79c5f307f117e289f7113922b94933b) Thanks [@lemonmade](https://github.com/lemonmade)! - Add back @quilted/craft/graphql entry point

## 0.2.3

### Patch Changes

- [`e81fc8cb`](https://github.com/lemonmade/quilt/commit/e81fc8cb3fa3b429a91db83e30fcb56bdc7f776a) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade Vite

## 0.2.2

### Patch Changes

- [`74b789bf`](https://github.com/lemonmade/quilt/commit/74b789bf110a4a91dbd5f2d6f02f1597a90d1eac) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix craft execution of GraphQL types CLI

## 0.2.1

### Patch Changes

- [`7f3297fa`](https://github.com/lemonmade/quilt/commit/7f3297facce376a98ced95dceb7d9c6200dad9c0) Thanks [@lemonmade](https://github.com/lemonmade)! - Expose `quilt` executable

- [`e407aec5`](https://github.com/lemonmade/quilt/commit/e407aec56e697eadfc7b1e62168ad40a49738d96) Thanks [@lemonmade](https://github.com/lemonmade)! - Dissolve TypeScript package between craft and quilt

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor `@quilted/craft` to be just a thin layer over Rollup and Vite

### Patch Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Move worker tooling configuration

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Add dedicated Babel package

- Updated dependencies [[`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca), [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca), [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca)]:
  - @quilted/rollup@0.2.0
  - @quilted/graphql-tools@0.2.0

## 0.1.239

### Patch Changes

- [`730bad06`](https://github.com/lemonmade/quilt/commit/730bad06e0b30ef2773239da62744a36031e39ad) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove module craft code

## 0.1.238

### Patch Changes

- [`750dd6b9`](https://github.com/lemonmade/quilt/commit/750dd6b9cb6a18648cc793f57579fb0b64cb23bc) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Rollup dependencies

- Updated dependencies [[`750dd6b9`](https://github.com/lemonmade/quilt/commit/750dd6b9cb6a18648cc793f57579fb0b64cb23bc)]:
  - @quilted/assets@0.0.5
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.15
  - @quilted/async@0.3.46
  - @quilted/quilt@0.5.158

## 0.1.237

### Patch Changes

- [`8123b38e`](https://github.com/lemonmade/quilt/commit/8123b38eba784ef9ae01ea2744bb9deb82fe435c) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve tooling export paths

## 0.1.236

### Patch Changes

- [`811c5aa9`](https://github.com/lemonmade/quilt/commit/811c5aa995a4a500316da5227e686c589865fe18) Thanks [@lemonmade](https://github.com/lemonmade)! - Disable GraphQL manifest in apps without GraphQL

## 0.1.235

### Patch Changes

- Updated dependencies [[`a68e6915`](https://github.com/lemonmade/quilt/commit/a68e691535e0b472883bebc4b4b3671ad885cfd9), [`055ffe19`](https://github.com/lemonmade/quilt/commit/055ffe19fdfde694d24f700d8cd8c7636491556a)]:
  - @quilted/quilt@0.5.155
  - @quilted/graphql-tools@0.1.7

## 0.1.234

### Patch Changes

- [`f6450fca`](https://github.com/lemonmade/quilt/commit/f6450fca76fdaba22daa8789918496c2c0f95f7b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `BrowserAssets` export in development

## 0.1.233

### Patch Changes

- [#612](https://github.com/lemonmade/quilt/pull/612) [`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app template APIs

- Updated dependencies [[`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f)]:
  - @quilted/assets@0.0.4
  - @quilted/polyfills@0.2.35
  - @quilted/quilt@0.5.153
  - @quilted/async@0.3.45

## 0.1.232

### Patch Changes

- [`6c99a77c`](https://github.com/lemonmade/quilt/commit/6c99a77cf0695b9ccf0e665c72d897374ac3c043) Thanks [@lemonmade](https://github.com/lemonmade)! - Update some craft step names

## 0.1.231

### Patch Changes

- Updated dependencies [[`9696dba6`](https://github.com/lemonmade/quilt/commit/9696dba6c59733b865b41bea303f91340ae5931f)]:
  - @quilted/sewing-kit@0.2.40

## 0.1.230

### Patch Changes

- [`be6e9c40`](https://github.com/lemonmade/quilt/commit/be6e9c40daa76a6568767c58cb373c3de7015ca5) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Rollup, Vite, and ESBuild dependencies

- [`7191e030`](https://github.com/lemonmade/quilt/commit/7191e03087ae3197e57240eb560314c7df691c05) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade TypeScript and Node dependencies

- Updated dependencies [[`be6e9c40`](https://github.com/lemonmade/quilt/commit/be6e9c40daa76a6568767c58cb373c3de7015ca5), [`7191e030`](https://github.com/lemonmade/quilt/commit/7191e03087ae3197e57240eb560314c7df691c05)]:
  - @quilted/graphql-tools@0.1.6
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.14
  - @quilted/eslint-config@0.2.3
  - @quilted/typescript@0.2.21

## 0.1.229

### Patch Changes

- Updated dependencies [[`fa75574c`](https://github.com/lemonmade/quilt/commit/fa75574c8697726f70321e43c2d2d554ea674926)]:
  - @quilted/async@0.3.44

## 0.1.228

### Patch Changes

- [`bbdb541b`](https://github.com/lemonmade/quilt/commit/bbdb541bd0816554b7f7578967b6337ec15c5cf9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add GraphQL manifest generation

- Updated dependencies [[`bbdb541b`](https://github.com/lemonmade/quilt/commit/bbdb541bd0816554b7f7578967b6337ec15c5cf9)]:
  - @quilted/graphql-tools@0.1.5

## 0.1.227

### Patch Changes

- [`1a18edbb`](https://github.com/lemonmade/quilt/commit/1a18edbb8b69d5175ec9adf2d6c29e708f1cb8e4) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependency

## 0.1.226

### Patch Changes

- [`998641d8`](https://github.com/lemonmade/quilt/commit/998641d8a7ef3370c556c50a30111ffde6287eb9) Thanks [@lemonmade](https://github.com/lemonmade)! - More polyfill and request-handler craft fixes

## 0.1.225

### Patch Changes

- [`5c017f1e`](https://github.com/lemonmade/quilt/commit/5c017f1e734b1d509f50a428de4a1c3f77429e2a) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve selection of request-router and polyfill package

## 0.1.224

### Patch Changes

- [`dca06910`](https://github.com/lemonmade/quilt/commit/dca069108b5d26816b5e2331106c53bf64198578) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix browser entry not preserving exports

## 0.1.223

### Patch Changes

- [`f47c0506`](https://github.com/lemonmade/quilt/commit/f47c0506d396f598368f92f0e27056d46c83830f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix custom app server builds

## 0.1.222

### Patch Changes

- Updated dependencies [[`00d90d10`](https://github.com/lemonmade/quilt/commit/00d90d10f4eb97fe55712adcc8b34aa3d3ec1aa1), [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d), [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2), [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb)]:
  - @quilted/quilt@0.5.148
  - @quilted/workers@0.2.36
  - @quilted/async@0.3.43

## 0.1.221

### Patch Changes

- [`c0fbb640`](https://github.com/lemonmade/quilt/commit/c0fbb64016aa3b347bf83424c389891304dc5360) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix dev asset manifest

- [`361a0d25`](https://github.com/lemonmade/quilt/commit/361a0d253534db599cbac6a49c6e8216a6b0410f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix entry file errors for projects that don't need an entry

- Updated dependencies [[`93facb53`](https://github.com/lemonmade/quilt/commit/93facb530324894667817a6d2f78baea19a3b622)]:
  - @quilted/quilt@0.5.147

## 0.1.220

### Patch Changes

- [#582](https://github.com/lemonmade/quilt/pull/582) [`6dca6fcf`](https://github.com/lemonmade/quilt/commit/6dca6fcf62fbed7600400b619e5509c7d7f7fb45) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow async module global to be lazy initialized

- Updated dependencies [[`6dca6fcf`](https://github.com/lemonmade/quilt/commit/6dca6fcf62fbed7600400b619e5509c7d7f7fb45)]:
  - @quilted/async@0.3.42
  - @quilted/quilt@0.5.146

## 0.1.219

### Patch Changes

- [`8fa1a6bd`](https://github.com/lemonmade/quilt/commit/8fa1a6bd67d3112ae0054f6fff531889f762cd52) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Prettier dependencies

- Updated dependencies [[`8fa1a6bd`](https://github.com/lemonmade/quilt/commit/8fa1a6bd67d3112ae0054f6fff531889f762cd52)]:
  - @quilted/eslint-config@0.2.2
  - @quilted/quilt@0.5.145

## 0.1.218

### Patch Changes

- [`59f67964`](https://github.com/lemonmade/quilt/commit/59f67964d5751df84b3150fd1e2a6e00b85f52e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix type errors from new GraphQL types

## 0.1.217

### Patch Changes

- Updated dependencies [[`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb)]:
  - @quilted/quilt@0.5.144
  - @quilted/graphql-tools@0.1.4

## 0.1.216

### Patch Changes

- Updated dependencies [[`0a5e1036`](https://github.com/lemonmade/quilt/commit/0a5e10369e2687b967fdf36387f2c4c72e45b70e)]:
  - @quilted/graphql-tools@0.1.3

## 0.1.215

### Patch Changes

- [`530da479`](https://github.com/lemonmade/quilt/commit/530da479415230c9e307f3c93f535a5839e3b2bd) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix process.env.NODE_ENV replacement

## 0.1.214

### Patch Changes

- [`ed2b8c44`](https://github.com/lemonmade/quilt/commit/ed2b8c44fc0a9b9bcfda78e8958f1dc7e717a138) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL imports in tests

## 0.1.213

### Patch Changes

- [`1335ce47`](https://github.com/lemonmade/quilt/commit/1335ce47fb86ae628a421a22c22c794d94a307ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript

- [`968084d7`](https://github.com/lemonmade/quilt/commit/968084d73cf3fcb0bb884348a24d9f93ca90e9b3) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact

- [`345e40b7`](https://github.com/lemonmade/quilt/commit/345e40b73bbc95e23b6d2ecf822b2ea2a705363a) Thanks [@lemonmade](https://github.com/lemonmade)! - Update build dependencies

- [`039d6572`](https://github.com/lemonmade/quilt/commit/039d6572ffe0a16054fa52c67261fe163407c3df) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Babel dependencies

- [`839c33f6`](https://github.com/lemonmade/quilt/commit/839c33f6d22a5db0d97989e8c6ef9fa049698182) Thanks [@lemonmade](https://github.com/lemonmade)! - Random assortment of other dependency updates

- Updated dependencies [[`1335ce47`](https://github.com/lemonmade/quilt/commit/1335ce47fb86ae628a421a22c22c794d94a307ea), [`345e40b7`](https://github.com/lemonmade/quilt/commit/345e40b73bbc95e23b6d2ecf822b2ea2a705363a), [`039d6572`](https://github.com/lemonmade/quilt/commit/039d6572ffe0a16054fa52c67261fe163407c3df), [`839c33f6`](https://github.com/lemonmade/quilt/commit/839c33f6d22a5db0d97989e8c6ef9fa049698182)]:
  - @quilted/async@0.3.41
  - @quilted/eslint-config@0.2.1
  - @quilted/typescript@0.2.20
  - @quilted/workers@0.2.35
  - @quilted/graphql-tools@0.1.2
  - @quilted/quilt@0.5.143

## 0.1.212

### Patch Changes

- [#560](https://github.com/lemonmade/quilt/pull/560) [`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add changeset

- Updated dependencies [[`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9)]:
  - @quilted/quilt@0.5.142
  - @quilted/graphql-tools@0.1.1

## 0.1.211

### Patch Changes

- Updated dependencies [[`26f85af8`](https://github.com/lemonmade/quilt/commit/26f85af81e17f7206811043050ccaaa7e308aa9a)]:
  - @quilted/graphql@0.5.2

## 0.1.210

### Patch Changes

- Updated dependencies [[`2b810f91`](https://github.com/lemonmade/quilt/commit/2b810f91dab9a1c30c06d40c0e8018d59ecb77b3)]:
  - @quilted/graphql@0.5.1

## 0.1.209

### Patch Changes

- Updated dependencies [[`350d2074`](https://github.com/lemonmade/quilt/commit/350d2074917e22bfa77ccad6bdcfe2f0f83ceb21)]:
  - @quilted/graphql@0.5.0
  - @quilted/quilt@0.5.141

## 0.1.208

### Patch Changes

- Updated dependencies [[`147f7984`](https://github.com/lemonmade/quilt/commit/147f798467b77b39b92b833efaeb8511bba0a6b7)]:
  - @quilted/graphql@0.4.61

## 0.1.207

### Patch Changes

- Updated dependencies [[`2f187348`](https://github.com/lemonmade/quilt/commit/2f1873489b508bf4333739e784d0f2139bdb33ed), [`69402e99`](https://github.com/lemonmade/quilt/commit/69402e99ed3a8f4a08e3f4c948d8c8539de39812)]:
  - @quilted/graphql@0.4.60

## 0.1.206

### Patch Changes

- Updated dependencies [[`7c4c416d`](https://github.com/lemonmade/quilt/commit/7c4c416d86624d24678485e6b6254bbbf73f203b)]:
  - @quilted/graphql@0.4.59

## 0.1.205

### Patch Changes

- [`67dc06e8`](https://github.com/lemonmade/quilt/commit/67dc06e8a680c3d35f08b721ae717e3643add4a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix process.env.NODE_ENV in workers

- [`67dc06e8`](https://github.com/lemonmade/quilt/commit/67dc06e8a680c3d35f08b721ae717e3643add4a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React use client warning detection

## 0.1.204

### Patch Changes

- [`639e2a35`](https://github.com/lemonmade/quilt/commit/639e2a35d6ce3f4319217d5791152c0a29c2edf8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix warnings from 'use client' directives

## 0.1.203

### Patch Changes

- Updated dependencies [[`8fac6a8d`](https://github.com/lemonmade/quilt/commit/8fac6a8d089dad2905ab9d4e1192d96b628a48eb)]:
  - @quilted/graphql@0.4.58

## 0.1.202

### Patch Changes

- [`ebce2c8a`](https://github.com/lemonmade/quilt/commit/ebce2c8a91a97c1fc41911db3b2cce4b67122e1d) Thanks [@lemonmade](https://github.com/lemonmade)! - Update linting dependencies

- Updated dependencies [[`ebce2c8a`](https://github.com/lemonmade/quilt/commit/ebce2c8a91a97c1fc41911db3b2cce4b67122e1d)]:
  - @quilted/eslint-config@0.2.0

## 0.1.201

### Patch Changes

- [`95a58eb6`](https://github.com/lemonmade/quilt/commit/95a58eb63edebe27301d18d58b37fe76e95b01c4) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow specifying React options for projects

- [`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies and fix some missing peer dependencies

- Updated dependencies [[`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3)]:
  - @quilted/quilt@0.5.140

## 0.1.200

### Patch Changes

- [`06bf4cbf`](https://github.com/lemonmade/quilt/commit/06bf4cbf21539d6ca84dc4ab1836165b360fc27a) Thanks [@lemonmade](https://github.com/lemonmade)! - Actually fix test decorators

## 0.1.199

### Patch Changes

- [`7fdb3221`](https://github.com/lemonmade/quilt/commit/7fdb3221e233e87105cdf24c95f117b8e2005c2f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix Babel decorator transpilation

## 0.1.198

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

- Updated dependencies [[`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1)]:
  - @quilted/assets@0.0.3
  - @quilted/async@0.3.40
  - @quilted/eslint-config@0.1.17
  - @quilted/graphql@0.4.57
  - @quilted/polyfills@0.2.34
  - @quilted/quilt@0.5.139
  - @quilted/sewing-kit@0.2.39
  - @quilted/typescript@0.2.19
  - @quilted/workers@0.2.34

## 0.1.197

### Patch Changes

- [`21018f1b`](https://github.com/lemonmade/quilt/commit/21018f1b80925c033241a3d8728a95f1374004ef) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset base URL in dev

## 0.1.196

### Patch Changes

- [#532](https://github.com/lemonmade/quilt/pull/532) [`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56) Thanks [@lemonmade](https://github.com/lemonmade)! - Move asset manifest code into asset packages

- [`ed03b7a5`](https://github.com/lemonmade/quilt/commit/ed03b7a5658fd005912eca528f423df6ad650dae) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix internal package aliases

- Updated dependencies [[`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56)]:
  - @quilted/assets@0.0.2
  - @quilted/async@0.3.39
  - @quilted/quilt@0.5.138

## 0.1.195

### Patch Changes

- [#527](https://github.com/lemonmade/quilt/pull/527) [`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve asset manifests

- [#525](https://github.com/lemonmade/quilt/pull/525) [`57d13aed`](https://github.com/lemonmade/quilt/commit/57d13aed3815adb36ae74993b068903a7efc680c) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade Preact dependency

- Updated dependencies [[`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac), [`59f08f2f`](https://github.com/lemonmade/quilt/commit/59f08f2f2ec344cb438b764e34fe62f8b0d40ebd)]:
  - @quilted/async@0.3.38
  - @quilted/quilt@0.5.137
  - @quilted/graphql@0.4.56

## 0.1.194

### Patch Changes

- [`a2fb1f89`](https://github.com/lemonmade/quilt/commit/a2fb1f89a00313a8d6040ff534acb3ab38ebd440) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix module build minification and file names

## 0.1.193

### Patch Changes

- [`aa62176c`](https://github.com/lemonmade/quilt/commit/aa62176c695993d43e34a4ef08400c7effda8a76) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic ability to create a module

## 0.1.192

### Patch Changes

- [`b378b4f4`](https://github.com/lemonmade/quilt/commit/b378b4f40906f9edc81d4283cf29e753255a0362) Thanks [@lemonmade](https://github.com/lemonmade)! - Update default build output locations

- Updated dependencies [[`10574343`](https://github.com/lemonmade/quilt/commit/105743435ad7143acb50dfdee92f6d3422167888)]:
  - @quilted/quilt@0.5.134

## 0.1.191

### Patch Changes

- [`40b334a4`](https://github.com/lemonmade/quilt/commit/40b334a4ec3bcebc2568134bbb1e1286754df8cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Nicer identifiers for async entries

- Updated dependencies [[`40b334a4`](https://github.com/lemonmade/quilt/commit/40b334a4ec3bcebc2568134bbb1e1286754df8cd)]:
  - @quilted/async@0.3.37

## 0.1.190

### Patch Changes

- [`255118b0`](https://github.com/lemonmade/quilt/commit/255118b0eb90a511fc8f4d7c2d19a79808cd2377) Thanks [@lemonmade](https://github.com/lemonmade)! - Add a hook to customize asset output directory

- [`94ad3bf9`](https://github.com/lemonmade/quilt/commit/94ad3bf9f5e71bf0aba8eecc7e535e3af599fdf2) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Cloudflare integration to support Pages

- Updated dependencies [[`3bcf9904`](https://github.com/lemonmade/quilt/commit/3bcf99041e5c27ecdafeeee96a176639269cb006)]:
  - @quilted/quilt@0.5.133

## 0.1.189

### Patch Changes

- [#508](https://github.com/lemonmade/quilt/pull/508) [`befb2aa9`](https://github.com/lemonmade/quilt/commit/befb2aa9d374aff66cbfe54fc8157522e3d3af21) Thanks [@lemonmade](https://github.com/lemonmade)! - Move logic out of HTML component

- [#508](https://github.com/lemonmade/quilt/pull/508) [`befb2aa9`](https://github.com/lemonmade/quilt/commit/befb2aa9d374aff66cbfe54fc8157522e3d3af21) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic streaming server render

- Updated dependencies [[`befb2aa9`](https://github.com/lemonmade/quilt/commit/befb2aa9d374aff66cbfe54fc8157522e3d3af21)]:
  - @quilted/async@0.3.36
  - @quilted/quilt@0.5.131

## 0.1.188

### Patch Changes

- [`615a59b7`](https://github.com/lemonmade/quilt/commit/615a59b76cf868a5074256603b1bf47c19f92255) Thanks [@lemonmade](https://github.com/lemonmade)! - More vendor bundle improvements

## 0.1.187

### Patch Changes

- [`c116a12b`](https://github.com/lemonmade/quilt/commit/c116a12bec09a3f25f409ac8d93ed3e96bfddc6e) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve dependency bundles

## 0.1.186

### Patch Changes

- Updated dependencies [[`c3b95b5c`](https://github.com/lemonmade/quilt/commit/c3b95b5c17345394a99035bd43eee1e7440e6979)]:
  - @quilted/async@0.3.35

## 0.1.185

### Patch Changes

- [`8945415d`](https://github.com/lemonmade/quilt/commit/8945415d8f196724e409a259cf319d9f09631ae2) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve some bundling defaults

- Updated dependencies [[`8945415d`](https://github.com/lemonmade/quilt/commit/8945415d8f196724e409a259cf319d9f09631ae2)]:
  - @quilted/async@0.3.34

## 0.1.184

### Patch Changes

- Updated dependencies [[`96b3a48b`](https://github.com/lemonmade/quilt/commit/96b3a48b649f86995f6d95ab1c85001b14bb4c67), [`be817feb`](https://github.com/lemonmade/quilt/commit/be817feb777fd056b3e868f62a2359df8c1d9e37)]:
  - @quilted/async@0.3.33
  - @quilted/graphql@0.4.55

## 0.1.183

### Patch Changes

- [`139d7b57`](https://github.com/lemonmade/quilt/commit/139d7b57dbc0ff64554360fa32e2f0f4f9a33181) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix default server entry

- [`139d7b57`](https://github.com/lemonmade/quilt/commit/139d7b57dbc0ff64554360fa32e2f0f4f9a33181) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve default server log

## 0.1.182

### Patch Changes

- [#495](https://github.com/lemonmade/quilt/pull/495) [`0b7db36e`](https://github.com/lemonmade/quilt/commit/0b7db36e5333067761c8a88fec5722057ab0e04f) Thanks [@lemonmade](https://github.com/lemonmade)! - Match server and browser app entries

- Updated dependencies [[`0b7db36e`](https://github.com/lemonmade/quilt/commit/0b7db36e5333067761c8a88fec5722057ab0e04f)]:
  - @quilted/quilt@0.5.129

## 0.1.181

### Patch Changes

- Updated dependencies [[`7978e6eb`](https://github.com/lemonmade/quilt/commit/7978e6eb62978b4ea970ceb4683d9f0a64040912), [`7978e6eb`](https://github.com/lemonmade/quilt/commit/7978e6eb62978b4ea970ceb4683d9f0a64040912)]:
  - @quilted/graphql@0.4.54

## 0.1.180

### Patch Changes

- [`8dedbf8b`](https://github.com/lemonmade/quilt/commit/8dedbf8b263347577c534a57658de748387cb9c7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL test issues

- [`507bebfd`](https://github.com/lemonmade/quilt/commit/507bebfd8cde2bd71ef7c25e38fac915e3f9b925) Thanks [@lemonmade](https://github.com/lemonmade)! - Only run GraphQL types when needed

- [`8867494f`](https://github.com/lemonmade/quilt/commit/8867494f90526c4147fdaf1d79195349bcb7d459) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix resolving signals libraries in Jest

- Updated dependencies [[`8dedbf8b`](https://github.com/lemonmade/quilt/commit/8dedbf8b263347577c534a57658de748387cb9c7), [`507bebfd`](https://github.com/lemonmade/quilt/commit/507bebfd8cde2bd71ef7c25e38fac915e3f9b925)]:
  - @quilted/graphql@0.4.53
  - @quilted/sewing-kit@0.2.38

## 0.1.179

### Patch Changes

- Updated dependencies [[`76e88c75`](https://github.com/lemonmade/quilt/commit/76e88c75d89e194e084d879392fb7a718197ccdf), [`4534547f`](https://github.com/lemonmade/quilt/commit/4534547f3677f643ce89ec3c364769bfc0bafc55)]:
  - @quilted/graphql@0.4.52
  - @quilted/quilt@0.5.128
  - @quilted/polyfills@0.2.33

## 0.1.178

### Patch Changes

- [#489](https://github.com/lemonmade/quilt/pull/489) [`c0dee75a`](https://github.com/lemonmade/quilt/commit/c0dee75aae600e882d419ee4e81b2c35d4772565) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix async loading in Vite

- Updated dependencies [[`c0dee75a`](https://github.com/lemonmade/quilt/commit/c0dee75aae600e882d419ee4e81b2c35d4772565), [`c0dee75a`](https://github.com/lemonmade/quilt/commit/c0dee75aae600e882d419ee4e81b2c35d4772565)]:
  - @quilted/async@0.3.32

## 0.1.177

### Patch Changes

- [`55336251`](https://github.com/lemonmade/quilt/commit/5533625189999f06e5111a9acba14e001a9d847c) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up async APIs

- Updated dependencies [[`55336251`](https://github.com/lemonmade/quilt/commit/5533625189999f06e5111a9acba14e001a9d847c)]:
  - @quilted/async@0.3.31
  - @quilted/quilt@0.5.126

## 0.1.176

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

- [`dce549a1`](https://github.com/lemonmade/quilt/commit/dce549a19f296e3b20b70cff8da46fca517dda79) Thanks [@lemonmade](https://github.com/lemonmade)! - Dedupe key dependencies

- Updated dependencies [[`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474), [`50215b7c`](https://github.com/lemonmade/quilt/commit/50215b7c005c21440bca04935fda87d98d9d9d01)]:
  - @quilted/async@0.3.30
  - @quilted/graphql@0.4.51
  - @quilted/polyfills@0.2.32
  - @quilted/quilt@0.5.125
  - @quilted/sewing-kit@0.2.37
  - @quilted/workers@0.2.33

## 0.1.175

### Patch Changes

- Updated dependencies [[`4755e44c`](https://github.com/lemonmade/quilt/commit/4755e44c4c0f7bd5519fed0aeb8428abd8c185f5)]:
  - @quilted/async@0.3.29

## 0.1.174

### Patch Changes

- [#474](https://github.com/lemonmade/quilt/pull/474) [`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04) Thanks [@lemonmade](https://github.com/lemonmade)! - Looser React version restrictions

- [#473](https://github.com/lemonmade/quilt/pull/473) [`e647289c`](https://github.com/lemonmade/quilt/commit/e647289c14a2bf8d0d9d322cd3fe1be3f675c535) Thanks [@lemonmade](https://github.com/lemonmade)! - Use React’s root functions to render client entry

- Updated dependencies [[`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04)]:
  - @quilted/quilt@0.5.123

## 0.1.173

### Patch Changes

- [#470](https://github.com/lemonmade/quilt/pull/470) [`03e8da71`](https://github.com/lemonmade/quilt/commit/03e8da71c1c54b497f2b0d153a8414ae8e772666) Thanks [@lemonmade](https://github.com/lemonmade)! - Don't crash app server for http response errors

- Updated dependencies [[`03e8da71`](https://github.com/lemonmade/quilt/commit/03e8da71c1c54b497f2b0d153a8414ae8e772666)]:
  - @quilted/quilt@0.5.122

## 0.1.172

### Patch Changes

- [`29c906c0`](https://github.com/lemonmade/quilt/commit/29c906c065b675a6009e84780f43a44012411ba4) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix additional incorrect port log

## 0.1.171

### Patch Changes

- [`82359ac1`](https://github.com/lemonmade/quilt/commit/82359ac151607bf76b807fe0991c31f33981783a) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix app server listening message in dev

## 0.1.170

### Patch Changes

- [#454](https://github.com/lemonmade/quilt/pull/454) [`af3c4cf5`](https://github.com/lemonmade/quilt/commit/af3c4cf5caa33b46e7f362817110a9df21bf446e) Thanks [@lemonmade](https://github.com/lemonmade)! - Make app dev server take another available port

- Updated dependencies [[`af3c4cf5`](https://github.com/lemonmade/quilt/commit/af3c4cf5caa33b46e7f362817110a9df21bf446e)]:
  - @quilted/sewing-kit@0.2.36

## 0.1.169

### Patch Changes

- [`a14c2f98`](https://github.com/lemonmade/quilt/commit/a14c2f98ccc85bd2d6c1599c09a6c6d4d8236247) Thanks [@lemonmade](https://github.com/lemonmade)! - Use esbuild JSX transform in development

- Updated dependencies [[`98c6aa4b`](https://github.com/lemonmade/quilt/commit/98c6aa4b9b5f45cc947f25446e1f05e2145d64a7), [`18edaf58`](https://github.com/lemonmade/quilt/commit/18edaf58aa66a8a138cbd36040d70cba373ccd6f), [`6ad741b2`](https://github.com/lemonmade/quilt/commit/6ad741b241027c8d7612e206497935ad938ea6c9)]:
  - @quilted/quilt@0.5.121
  - @quilted/graphql@0.4.50

## 0.1.168

### Patch Changes

- [`a5fff962`](https://github.com/lemonmade/quilt/commit/a5fff96280306bd22fa2bc9e52cbe3cf50575ca1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix development servers

## 0.1.167

### Patch Changes

- [`76b00778`](https://github.com/lemonmade/quilt/commit/76b00778b9e8733be372995a6c8a901e42929a5a) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix build outputs for app servers

## 0.1.166

### Patch Changes

- [#436](https://github.com/lemonmade/quilt/pull/436) [`3171fcee`](https://github.com/lemonmade/quilt/commit/3171fceeddfb14c253ac45e34e1e2f9ab6e3f6c0) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename http-handlers to request-router

- Updated dependencies [[`3171fcee`](https://github.com/lemonmade/quilt/commit/3171fceeddfb14c253ac45e34e1e2f9ab6e3f6c0)]:
  - @quilted/quilt@0.5.119

## 0.1.165

### Patch Changes

- [`55d4668c`](https://github.com/lemonmade/quilt/commit/55d4668c329988efe354964817461f6cd9d5f538) Thanks [@lemonmade](https://github.com/lemonmade)! - Don’t add prefix to node modules when inlining

- [`ff68c1d2`](https://github.com/lemonmade/quilt/commit/ff68c1d244359e1efec73fa40a8be4d450a11399) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix jsdom environment

- [#434](https://github.com/lemonmade/quilt/pull/434) [`79b1481f`](https://github.com/lemonmade/quilt/commit/79b1481fe2b5d617abe823d80d385c95e588dd44) Thanks [@lemonmade](https://github.com/lemonmade)! - Use prettier cache options

- Updated dependencies [[`f8157c47`](https://github.com/lemonmade/quilt/commit/f8157c4751cd2cde941e452036fdb814124e0840)]:
  - @quilted/quilt@0.5.118

## 0.1.164

### Patch Changes

- [`b573c247`](https://github.com/lemonmade/quilt/commit/b573c2474fd466804b8e7550634f728f257fb0fe) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify Preact integration

- Updated dependencies [[`10bd0508`](https://github.com/lemonmade/quilt/commit/10bd0508885078de817b07a43ae73a0ab57f66fa)]:
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.13

## 0.1.163

### Patch Changes

- [`7d2c4353`](https://github.com/lemonmade/quilt/commit/7d2c4353ab96c1de96faf53ea328b8e054e8fd3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix resolution of @babel/plugin-syntax-typescript

## 0.1.162

### Patch Changes

- [#429](https://github.com/lemonmade/quilt/pull/429) [`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7) Thanks [@lemonmade](https://github.com/lemonmade)! - Update all development dependencies to their latest versions

- Updated dependencies [[`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7)]:
  - @quilted/eslint-config@0.1.16
  - @quilted/graphql@0.4.49

## 0.1.161

### Patch Changes

- Updated dependencies [[`734f60c8`](https://github.com/lemonmade/quilt/commit/734f60c8d94eb692d5e641392feeff3c20a9f29d), [`5e64e711`](https://github.com/lemonmade/quilt/commit/5e64e711c881c2969e08f40be72f50352449fa6a)]:
  - @quilted/graphql@0.4.48

## 0.1.160

### Patch Changes

- [`c916126e`](https://github.com/lemonmade/quilt/commit/c916126eb90d8472c4bd75fa571a00fa562855f5) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package file output paths

## 0.1.159

### Patch Changes

- Updated dependencies [[`a9c2b818`](https://github.com/lemonmade/quilt/commit/a9c2b81825c77f7fc27f58272b6a5f54cde7cd38)]:
  - @quilted/polyfills@0.2.31

## 0.1.158

### Patch Changes

- [`b31472f4`](https://github.com/lemonmade/quilt/commit/b31472f45a3928f34163343351e5356312dffd67) Thanks [@lemonmade](https://github.com/lemonmade)! - Slightly better debugging of GraphQL type errors

- Updated dependencies [[`b31472f4`](https://github.com/lemonmade/quilt/commit/b31472f45a3928f34163343351e5356312dffd67), [`39544227`](https://github.com/lemonmade/quilt/commit/39544227abefed9185b500e3461ad4ec2e5f11cb)]:
  - @quilted/graphql@0.4.47
  - @quilted/quilt@0.5.115

## 0.1.157

### Patch Changes

- Updated dependencies [[`aeb9655b`](https://github.com/lemonmade/quilt/commit/aeb9655bccdcaea6a1474b7a53c70353ceda3af6)]:
  - @quilted/graphql@0.4.46

## 0.1.156

### Patch Changes

- [`dd2d60b1`](https://github.com/lemonmade/quilt/commit/dd2d60b1ef9bf39887e3c553c482ebea5fffb7ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix preact signals bundling

## 0.1.155

### Patch Changes

- [`ac1e08de`](https://github.com/lemonmade/quilt/commit/ac1e08de022852ac0fe6f5331ea58066e375015d) Thanks [@lemonmade](https://github.com/lemonmade)! - Put all polyfills in the right bundle

## 0.1.154

### Patch Changes

- [`4fe2460f`](https://github.com/lemonmade/quilt/commit/4fe2460f1320bb0707c13ce820b34c5262c42ed8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix app build outputs when framework code imports from @babel/runtime

## 0.1.153

### Patch Changes

- [`5b2789b7`](https://github.com/lemonmade/quilt/commit/5b2789b78d8f9a9c0f43ddf974a3d7777bfd496c) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `quilt run stylelint` command

* [`d5fd7f67`](https://github.com/lemonmade/quilt/commit/d5fd7f67a6aa67ca9d776e1ada2a17c4febb11cf) Thanks [@lemonmade](https://github.com/lemonmade)! - More modern development browsers

## 0.1.152

### Patch Changes

- [`bfe0ae39`](https://github.com/lemonmade/quilt/commit/bfe0ae394fbaef08482c3855e19004b8cdb0badb) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for stylelint

* [`c37183a7`](https://github.com/lemonmade/quilt/commit/c37183a7591ab0a4ab4b09bccb4e37bd0687efe5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix Vite PostCSS configuration and allow nesting by default

## 0.1.151

### Patch Changes

- [`c5d05da9`](https://github.com/lemonmade/quilt/commit/c5d05da920c329191c90fe8aa2654958ec14293f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix cross-platform node options for executables

- Updated dependencies [[`c5d05da9`](https://github.com/lemonmade/quilt/commit/c5d05da920c329191c90fe8aa2654958ec14293f)]:
  - @quilted/graphql@0.4.45

## 0.1.150

### Patch Changes

- [`a266ef28`](https://github.com/lemonmade/quilt/commit/a266ef2819ecd3e53df56f36e070c72317d113f6) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix issues with Vite and Preact

## 0.1.149

### Patch Changes

- Updated dependencies [[`3e5cae74`](https://github.com/lemonmade/quilt/commit/3e5cae74ff923636cfdb371ca722b1473c617aa2), [`6b18de9e`](https://github.com/lemonmade/quilt/commit/6b18de9e4ade25668bc81f2f9e3dc96b1fd82615)]:
  - @quilted/graphql@0.4.44

## 0.1.148

### Patch Changes

- [#390](https://github.com/lemonmade/quilt/pull/390) [`15cf0022`](https://github.com/lemonmade/quilt/commit/15cf00222e8109d9076b4e90c438429628c86095) Thanks [@lemonmade](https://github.com/lemonmade)! - Update commonjs and esnext opt-outs

* [#390](https://github.com/lemonmade/quilt/pull/390) [`15cf0022`](https://github.com/lemonmade/quilt/commit/15cf00222e8109d9076b4e90c438429628c86095) Thanks [@lemonmade](https://github.com/lemonmade)! - Switch from binary => executable

* Updated dependencies [[`15cf0022`](https://github.com/lemonmade/quilt/commit/15cf00222e8109d9076b4e90c438429628c86095)]:
  - @quilted/graphql@0.4.43
  - @quilted/sewing-kit@0.2.35

## 0.1.147

### Patch Changes

- [#383](https://github.com/lemonmade/quilt/pull/383) [`1647d73e`](https://github.com/lemonmade/quilt/commit/1647d73e074f1f26653634c2bda6dcba79dc6527) Thanks [@lemonmade](https://github.com/lemonmade)! - Add test --parallel option

* [#383](https://github.com/lemonmade/quilt/pull/383) [`1647d73e`](https://github.com/lemonmade/quilt/commit/1647d73e074f1f26653634c2bda6dcba79dc6527) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade Jest to v28

* Updated dependencies [[`1647d73e`](https://github.com/lemonmade/quilt/commit/1647d73e074f1f26653634c2bda6dcba79dc6527)]:
  - @quilted/sewing-kit@0.2.34

## 0.1.146

### Patch Changes

- [`b4e0cffa`](https://github.com/lemonmade/quilt/commit/b4e0cffa908a00ad0b0a3138edeb2bb6121db056) Thanks [@lemonmade](https://github.com/lemonmade)! - Default packages to supporting React

## 0.1.145

### Patch Changes

- [`477e842c`](https://github.com/lemonmade/quilt/commit/477e842cfc9ef3dfa7f7ca910aa4eeee423d40a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix dev reloading of workers

* [`5c727ee3`](https://github.com/lemonmade/quilt/commit/5c727ee369ce0abfebff1bf3c4dcac2efb8311f8) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up some app worker handling in dev

## 0.1.144

### Patch Changes

- [#377](https://github.com/lemonmade/quilt/pull/377) [`55ccd529`](https://github.com/lemonmade/quilt/commit/55ccd52997190d9d16359c0e9c3fbd74137f84d9) Thanks [@lemonmade](https://github.com/lemonmade)! - Use modern rollup outputs when possible

* [#378](https://github.com/lemonmade/quilt/pull/378) [`940dd0b0`](https://github.com/lemonmade/quilt/commit/940dd0b0bd18805577b9f5cdf88619c3af3293a9) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix node-externals deprecation warning

## 0.1.143

### Patch Changes

- [#373](https://github.com/lemonmade/quilt/pull/373) [`a626d243`](https://github.com/lemonmade/quilt/commit/a626d24384548fc674ec180d221b00bb633c9358) Thanks [@lemonmade](https://github.com/lemonmade)! - Add quilt run command

- Updated dependencies [[`a626d243`](https://github.com/lemonmade/quilt/commit/a626d24384548fc674ec180d221b00bb633c9358)]:
  - @quilted/sewing-kit@0.2.33

## 0.1.142

### Patch Changes

- [#370](https://github.com/lemonmade/quilt/pull/370) [`c7adecdf`](https://github.com/lemonmade/quilt/commit/c7adecdf5830dad00f1c071aa92469b922f68123) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow simpler http handlers

- Updated dependencies [[`c7adecdf`](https://github.com/lemonmade/quilt/commit/c7adecdf5830dad00f1c071aa92469b922f68123)]:
  - @quilted/quilt@0.5.109

## 0.1.141

### Patch Changes

- [`f7ef3a80`](https://github.com/lemonmade/quilt/commit/f7ef3a807d418ba921f58acc271ba2aa6f55b04a) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.1.140

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

- Updated dependencies [[`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471)]:
  - @quilted/async@0.3.28
  - @quilted/browserslist-config@0.1.9
  - @quilted/eslint-config@0.1.15
  - @quilted/graphql@0.4.42
  - @quilted/polyfills@0.2.30
  - @quilted/prettier@0.2.11
  - @quilted/quilt@0.5.108
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.12
  - @quilted/sewing-kit@0.2.32
  - @quilted/typescript@0.2.18
  - @quilted/workers@0.2.32

## 0.1.139

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

- Updated dependencies [[`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e)]:
  - @quilted/async@0.3.27
  - @quilted/browserslist-config@0.1.8
  - @quilted/eslint-config@0.1.14
  - @quilted/graphql@0.4.41
  - @quilted/polyfills@0.2.29
  - @quilted/prettier@0.2.10
  - @quilted/quilt@0.5.107
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.11
  - @quilted/sewing-kit@0.2.31
  - @quilted/typescript@0.2.17
  - @quilted/workers@0.2.31

## 0.1.138

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

- Updated dependencies [[`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48)]:
  - @quilted/async@0.3.26
  - @quilted/browserslist-config@0.1.7
  - @quilted/eslint-config@0.1.13
  - @quilted/graphql@0.4.40
  - @quilted/polyfills@0.2.28
  - @quilted/prettier@0.2.9
  - @quilted/quilt@0.5.106
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.10
  - @quilted/sewing-kit@0.2.30
  - @quilted/typescript@0.2.16
  - @quilted/workers@0.2.30

## 0.1.137

### Patch Changes

- [`aab5fac6`](https://github.com/lemonmade/quilt/commit/aab5fac6c366bac5efef69e90a6a72dd97e5323a) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve .env loading and documentation

## 0.1.136

### Patch Changes

- [`ef446c6d`](https://github.com/lemonmade/quilt/commit/ef446c6db8384f285efa57c6d5b05a9d9a91fe11) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix web app development server fetch usage

## 0.1.135

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

* [#361](https://github.com/lemonmade/quilt/pull/361) [`47065859`](https://github.com/lemonmade/quilt/commit/47065859c330e2da23d8758fb165ae84a4f1af4f) Thanks [@lemonmade](https://github.com/lemonmade)! - Move to native Request and Response objects

* Updated dependencies [[`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd), [`47065859`](https://github.com/lemonmade/quilt/commit/47065859c330e2da23d8758fb165ae84a4f1af4f)]:
  - @quilted/async@0.3.25
  - @quilted/eslint-config@0.1.12
  - @quilted/graphql@0.4.39
  - @quilted/polyfills@0.2.27
  - @quilted/quilt@0.5.105
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.9
  - @quilted/sewing-kit@0.2.29
  - @quilted/typescript@0.2.15
  - @quilted/workers@0.2.29

## 0.1.134

### Patch Changes

- [`1da4887d`](https://github.com/lemonmade/quilt/commit/1da4887da85cd8a3d285b9b827cdb788373e6207) Thanks [@lemonmade](https://github.com/lemonmade)! - Make raw assets be reloaded in watch mode

## 0.1.133

### Patch Changes

- [`21f14f7f`](https://github.com/lemonmade/quilt/commit/21f14f7f856bef7e8526c18a72f4bad22ecae66f) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve dependency bundling configurations

## 0.1.132

### Patch Changes

- [`ae208dfb`](https://github.com/lemonmade/quilt/commit/ae208dfb20895ac8409e22b0e72d486d279d316b) Thanks [@lemonmade](https://github.com/lemonmade)! - Prefer runtime environment variables

## 0.1.131

### Patch Changes

- [`739ccd7a`](https://github.com/lemonmade/quilt/commit/739ccd7abffb397b8ec9f22bb65ddae4e3e6101f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some Jest aliases

* [`da164887`](https://github.com/lemonmade/quilt/commit/da1648879b459f4e2a496de75a664c2dfee37b67) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix binary resolution in non-pnpm package managers

* Updated dependencies [[`d9bedaf5`](https://github.com/lemonmade/quilt/commit/d9bedaf5fa212b37d3d3633a9495586df2d9e40c)]:
  - @quilted/quilt@0.5.104

## 0.1.130

### Patch Changes

- [#347](https://github.com/lemonmade/quilt/pull/347) [`ff9f7d62`](https://github.com/lemonmade/quilt/commit/ff9f7d62efc36140aa9add301f745b99115ac9bd) Thanks [@lemonmade](https://github.com/lemonmade)! - Inline process.env.NODE_ENV into built applications

## 0.1.129

### Patch Changes

- [`542675c4`](https://github.com/lemonmade/quilt/commit/542675c4422ca2f643296f6de1668ad0310ef1ff) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix HTTP handler build entries

## 0.1.128

### Patch Changes

- [`88bcd4b5`](https://github.com/lemonmade/quilt/commit/88bcd4b559a1376fd89f176cdad569196222255b) Thanks [@lemonmade](https://github.com/lemonmade)! - Undo from-source applying to consumers

## 0.1.127

### Patch Changes

- [#338](https://github.com/lemonmade/quilt/pull/338) [`3e2993f5`](https://github.com/lemonmade/quilt/commit/3e2993f598be4aad1b16ef378d7cd449de81c3b5) Thanks [@lemonmade](https://github.com/lemonmade)! - Add full support for from-source export condition

* [`a4c58e93`](https://github.com/lemonmade/quilt/commit/a4c58e93c94e5ad4a2e2c8742dce3aa19a73cf3f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix quilt commands using --skip and --only together

## 0.1.126

### Patch Changes

- [`ebd7d199`](https://github.com/lemonmade/quilt/commit/ebd7d19935b51d87e89e92f1f71c12a7e8646749) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix app server development entrypoint

## 0.1.125

### Patch Changes

- [#339](https://github.com/lemonmade/quilt/pull/339) [`f78240c4`](https://github.com/lemonmade/quilt/commit/f78240c43adf51ad29973a733357627ea8172320) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve craft to run with project dependencies

- Updated dependencies [[`f78240c4`](https://github.com/lemonmade/quilt/commit/f78240c43adf51ad29973a733357627ea8172320)]:
  - @quilted/sewing-kit@0.2.28

## 0.1.124

### Patch Changes

- [`af598b0e`](https://github.com/lemonmade/quilt/commit/af598b0ebe7962bde1423ef54339f3ae5b6b29bf) Thanks [@lemonmade](https://github.com/lemonmade)! - Move rollup plugins into craft

- Updated dependencies [[`af598b0e`](https://github.com/lemonmade/quilt/commit/af598b0ebe7962bde1423ef54339f3ae5b6b29bf)]:
  - @quilted/polyfills@0.2.26
  - @quilted/workers@0.2.28

## 0.1.123

### Patch Changes

- [`22d9a701`](https://github.com/lemonmade/quilt/commit/22d9a70110390ef8e50cf8f9f31b268d0e0818f4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add back prefresh plugin

## 0.1.122

### Patch Changes

- [`81e69086`](https://github.com/lemonmade/quilt/commit/81e6908640f61bd9f6553826aa227a67c241146c) Thanks [@lemonmade](https://github.com/lemonmade)! - Release craft react fixes

## 0.1.121

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

- Updated dependencies [[`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b)]:
  - @quilted/async@0.3.24
  - @quilted/eslint-config@0.1.11
  - @quilted/graphql@0.4.38
  - @quilted/polyfills@0.2.25
  - @quilted/quilt@0.5.102
  - @quilted/react-testing@0.5.12
  - @quilted/typescript@0.2.14
  - @quilted/workers@0.2.27

## 0.1.120

### Patch Changes

- [`27fff2a8`](https://github.com/lemonmade/quilt/commit/27fff2a8a30429c54d56a7f3f651576381f76ca5) Thanks [@lemonmade](https://github.com/lemonmade)! - Add raw asset loading

- Updated dependencies [[`27fff2a8`](https://github.com/lemonmade/quilt/commit/27fff2a8a30429c54d56a7f3f651576381f76ca5), [`4e2764c1`](https://github.com/lemonmade/quilt/commit/4e2764c1763c3aa30de10e694d7cf12ffb6748e8)]:
  - @quilted/typescript@0.2.13
  - @quilted/workers@0.2.26

## 0.1.119

### Patch Changes

- [`7a077060`](https://github.com/lemonmade/quilt/commit/7a077060b793839bd9e426e2690f82596aab198c) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset and style handling for apps

- Updated dependencies [[`7a077060`](https://github.com/lemonmade/quilt/commit/7a077060b793839bd9e426e2690f82596aab198c)]:
  - @quilted/quilt@0.5.101
  - @quilted/typescript@0.2.12

## 0.1.118

### Patch Changes

- [#318](https://github.com/lemonmade/quilt/pull/318) [`0a43680e`](https://github.com/lemonmade/quilt/commit/0a43680e5425064f7d44bcede8b4df2afb72b3d4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for importing static assets

- Updated dependencies [[`0a43680e`](https://github.com/lemonmade/quilt/commit/0a43680e5425064f7d44bcede8b4df2afb72b3d4), [`0a43680e`](https://github.com/lemonmade/quilt/commit/0a43680e5425064f7d44bcede8b4df2afb72b3d4)]:
  - @quilted/eslint-config@0.1.10
  - @quilted/quilt@0.5.100

## 0.1.117

### Patch Changes

- [`78b5f802`](https://github.com/lemonmade/quilt/commit/78b5f8029d3f9dddae8c7000a5ab711063500f6c) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve signature of app request handler helpers

* [`4f7d5738`](https://github.com/lemonmade/quilt/commit/4f7d5738890b65c984558ec613509b6e15ab3121) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve name of root entry CSS file

* Updated dependencies [[`78b5f802`](https://github.com/lemonmade/quilt/commit/78b5f8029d3f9dddae8c7000a5ab711063500f6c)]:
  - @quilted/quilt@0.5.99

## 0.1.116

### Patch Changes

- [`1942470a`](https://github.com/lemonmade/quilt/commit/1942470aff9e18ea4499d15ee42727a4ddf24969) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix final worker build issues

- Updated dependencies [[`1942470a`](https://github.com/lemonmade/quilt/commit/1942470aff9e18ea4499d15ee42727a4ddf24969)]:
  - @quilted/workers@0.2.25

## 0.1.115

### Patch Changes

- Updated dependencies [[`b197bb17`](https://github.com/lemonmade/quilt/commit/b197bb171c66cb4d51f9ecf97f29ddd6a808157d)]:
  - @quilted/workers@0.2.24

## 0.1.114

### Patch Changes

- Updated dependencies [[`f88502ca`](https://github.com/lemonmade/quilt/commit/f88502ca8c969d0da0991523cb1326c9fd6d2203), [`94dcb682`](https://github.com/lemonmade/quilt/commit/94dcb68224e7076a08070c46b5e3c31e7568a970)]:
  - @quilted/quilt@0.5.98
  - @quilted/workers@0.2.23

## 0.1.113

### Patch Changes

- Updated dependencies [[`c9b75e02`](https://github.com/lemonmade/quilt/commit/c9b75e02285fe6489f7a8e8b3e09d6815b918416)]:
  - @quilted/quilt@0.5.96
  - @quilted/workers@0.2.22

## 0.1.112

### Patch Changes

- [#302](https://github.com/lemonmade/quilt/pull/302) [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765) Thanks [@lemonmade](https://github.com/lemonmade)! - Add AbortController polyfill

* [#302](https://github.com/lemonmade/quilt/pull/302) [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve service outputs

* Updated dependencies [[`fbf35f12`](https://github.com/lemonmade/quilt/commit/fbf35f12cc5fe3d1da976e7fcd47898051620979), [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765), [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765)]:
  - @quilted/graphql@0.4.37
  - @quilted/polyfills@0.2.24
  - @quilted/quilt@0.5.94

## 0.1.111

### Patch Changes

- Updated dependencies [[`4c8feaac`](https://github.com/lemonmade/quilt/commit/4c8feaac8e42be19fd65954436c55377dd50a1f6)]:
  - @quilted/graphql@0.4.36

## 0.1.110

### Patch Changes

- Updated dependencies [[`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6)]:
  - @quilted/graphql@0.4.35
  - @quilted/quilt@0.5.93

## 0.1.109

### Patch Changes

- [`cee6a292`](https://github.com/lemonmade/quilt/commit/cee6a292f3afc18eefb42880f1b52a31535a6e79) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix .esnext containing more modern language features in dev

- Updated dependencies [[`8a8c878b`](https://github.com/lemonmade/quilt/commit/8a8c878bd8d5214b56af3381d28c1769820d84d7), [`ce7faaf8`](https://github.com/lemonmade/quilt/commit/ce7faaf8199e88a59a0fba8b1ac19943f8294867)]:
  - @quilted/graphql@0.4.34

## 0.1.108

### Patch Changes

- [`4e682689`](https://github.com/lemonmade/quilt/commit/4e6826899e6b8356b956823df0fe636e8cff20a1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix old SewingKit references

## 0.1.107

### Patch Changes

- [`d1178849`](https://github.com/lemonmade/quilt/commit/d11788499cdd19208d763df3fd78795b1ef1bd81) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix workers in development

## 0.1.106

### Patch Changes

- [#287](https://github.com/lemonmade/quilt/pull/287) [`ba876cbe`](https://github.com/lemonmade/quilt/commit/ba876cbe4ddc313966dce0550349319a50490ba6) Thanks [@lemonmade](https://github.com/lemonmade)! - Add better development server hooks

* [`7960a7bf`](https://github.com/lemonmade/quilt/commit/7960a7bf1723cb555fbf7500a4b4bf96a02377fa) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix package binary generation

* Updated dependencies [[`ba876cbe`](https://github.com/lemonmade/quilt/commit/ba876cbe4ddc313966dce0550349319a50490ba6), [`4c8ca274`](https://github.com/lemonmade/quilt/commit/4c8ca274fe5b42b12c06f516f55a93733dfce415)]:
  - @quilted/quilt@0.5.92
  - @quilted/graphql@0.4.33

## 0.1.105

### Patch Changes

- [#284](https://github.com/lemonmade/quilt/pull/284) [`a113062b`](https://github.com/lemonmade/quilt/commit/a113062b7807b3738a652ac8905fa834c0c4c7b7) Thanks [@lemonmade](https://github.com/lemonmade)! - Use miniflare during development for Cloudflare apps

* [#284](https://github.com/lemonmade/quilt/pull/284) [`a113062b`](https://github.com/lemonmade/quilt/commit/a113062b7807b3738a652ac8905fa834c0c4c7b7) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for custom development servers

* Updated dependencies [[`a113062b`](https://github.com/lemonmade/quilt/commit/a113062b7807b3738a652ac8905fa834c0c4c7b7)]:
  - @quilted/sewing-kit@0.2.27

## 0.1.104

### Patch Changes

- [#283](https://github.com/lemonmade/quilt/pull/283) [`daf06328`](https://github.com/lemonmade/quilt/commit/daf06328f242ac621b70942aa063a6138a12f62f) Thanks [@lemonmade](https://github.com/lemonmade)! - Rework asset manifest

- Updated dependencies [[`daf06328`](https://github.com/lemonmade/quilt/commit/daf06328f242ac621b70942aa063a6138a12f62f)]:
  - @quilted/async@0.3.23
  - @quilted/quilt@0.5.91

## 0.1.103

### Patch Changes

- [#279](https://github.com/lemonmade/quilt/pull/279) [`8a8dd2eb`](https://github.com/lemonmade/quilt/commit/8a8dd2eb3825a8420ed28f84da558f66bc2349e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add MODE env variable by default

- Updated dependencies [[`b939a411`](https://github.com/lemonmade/quilt/commit/b939a411f76086915994789eb873641f0c7dd8cd), [`281b36fd`](https://github.com/lemonmade/quilt/commit/281b36fd1dc6ea640da23e676b70673ce96d0080)]:
  - @quilted/quilt@0.5.89

## 0.1.102

### Patch Changes

- [`4f08906d`](https://github.com/lemonmade/quilt/commit/4f08906dc45f2224d89f9fd8e6c5d2360239328d) Thanks [@lemonmade](https://github.com/lemonmade)! - Move swr package to vendors bundle

* [`54beb61d`](https://github.com/lemonmade/quilt/commit/54beb61d64d91d0fb7a80e68ceb4f6e1f8e36106) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix Jest plugin inclusion

## 0.1.101

### Patch Changes

- [`a2bf98d2`](https://github.com/lemonmade/quilt/commit/a2bf98d2ac1e4b57f7540bb7d964c79080c5ccfe) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some bundling warnings

## 0.1.100

### Patch Changes

- [#251](https://github.com/lemonmade/quilt/pull/251) [`391f3261`](https://github.com/lemonmade/quilt/commit/391f3261179cc4f41a7aeeccdc25761bdabdb179) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies

* [`97134c59`](https://github.com/lemonmade/quilt/commit/97134c59fcf7ac43160ee5f1cb71662c12a99a01) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix PostCSS when no config is found

- [`d166f4a7`](https://github.com/lemonmade/quilt/commit/d166f4a795d505938f6436affaae7e26f8bbd582) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix servers bundling during development

* [`eb860efa`](https://github.com/lemonmade/quilt/commit/eb860efa0d889118649a6a12cecf73f7e22faf08) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some app dev server issues

* Updated dependencies [[`391f3261`](https://github.com/lemonmade/quilt/commit/391f3261179cc4f41a7aeeccdc25761bdabdb179)]:
  - @quilted/react-testing@0.5.11

## 0.1.99

### Patch Changes

- [`1942f847`](https://github.com/lemonmade/quilt/commit/1942f8476bdf5f94032f836ae887d34c46200cfb) Thanks [@lemonmade](https://github.com/lemonmade)! - Ignore CSS processing for server builds

## 0.1.98

### Patch Changes

- [#248](https://github.com/lemonmade/quilt/pull/248) [`2ea03b04`](https://github.com/lemonmade/quilt/commit/2ea03b04672fe5581870f6a3d53a736e52ace33e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add better PostCSS support

## 0.1.97

### Patch Changes

- [`dd65553f`](https://github.com/lemonmade/quilt/commit/dd65553fdda06254e95f6e0aa9b26dbca951676f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add Rollup node bundle utilities

- Updated dependencies [[`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0)]:
  - @quilted/graphql@0.4.32
  - @quilted/quilt@0.5.79

## 0.1.96

### Patch Changes

- [`9b488dcc`](https://github.com/lemonmade/quilt/commit/9b488dcc60a7433d906508e4de041cbe308d0437) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix app development server

## 0.1.95

### Patch Changes

- [#244](https://github.com/lemonmade/quilt/pull/244) [`5dc03e7c`](https://github.com/lemonmade/quilt/commit/5dc03e7c80bb77fc5460f8c81cf8ca65f0c15db1) Thanks [@lemonmade](https://github.com/lemonmade)! - New app development server

## 0.1.94

### Patch Changes

- [`963a1e7c`](https://github.com/lemonmade/quilt/commit/963a1e7c51b1f05807033b2cf1be35dbcbe5d7af) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix framework build outputs

## 0.1.93

### Patch Changes

- [#241](https://github.com/lemonmade/quilt/pull/241) [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query GraphQL hooks

- Updated dependencies [[`eb9f7d42`](https://github.com/lemonmade/quilt/commit/eb9f7d4271010a8edfd683d825e9d49cb8969c8e), [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8)]:
  - @quilted/graphql@0.4.31
  - @quilted/quilt@0.5.78

## 0.1.92

### Patch Changes

- [`90622a0b`](https://github.com/lemonmade/quilt/commit/90622a0b1c65ec2a3d5b45d907e284733c3215c5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix vite SSR externals hook

## 0.1.91

### Patch Changes

- [`563e0097`](https://github.com/lemonmade/quilt/commit/563e009757ba94e8021bb927e00462483b84d1e0) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React development server

- Updated dependencies [[`563e0097`](https://github.com/lemonmade/quilt/commit/563e009757ba94e8021bb927e00462483b84d1e0)]:
  - @quilted/quilt@0.5.77

## 0.1.90

### Patch Changes

- Updated dependencies [[`f6d7ae01`](https://github.com/lemonmade/quilt/commit/f6d7ae011e259a30a145cf80205143031c8223dd)]:
  - @quilted/graphql@0.4.30

## 0.1.89

### Patch Changes

- [`9ff374ba`](https://github.com/lemonmade/quilt/commit/9ff374ba7025e41b7e1a2ba2af5db096cce08600) Thanks [@lemonmade](https://github.com/lemonmade)! - Add more vite hooks

## 0.1.88

### Patch Changes

- [#228](https://github.com/lemonmade/quilt/pull/228) [`c7afc048`](https://github.com/lemonmade/quilt/commit/c7afc0486d37bc54da704c46cda1166690dda152) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade to stricter typescript options

- Updated dependencies [[`c7afc048`](https://github.com/lemonmade/quilt/commit/c7afc0486d37bc54da704c46cda1166690dda152)]:
  - @quilted/async@0.3.22
  - @quilted/graphql@0.4.29
  - @quilted/sewing-kit@0.2.26
  - @quilted/typescript@0.2.11
  - @quilted/workers@0.2.21

## 0.1.87

### Patch Changes

- [`4dc392e4`](https://github.com/lemonmade/quilt/commit/4dc392e49256eb2f58f6947d19a4fec074a10fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add debug flag to develop command

- Updated dependencies [[`4dc392e4`](https://github.com/lemonmade/quilt/commit/4dc392e49256eb2f58f6947d19a4fec074a10fb8)]:
  - @quilted/sewing-kit@0.2.25

## 0.1.86

### Patch Changes

- [`281928a0`](https://github.com/lemonmade/quilt/commit/281928a01f1442b8dc2dc4de04ef2933d6bccf24) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix output rollup entry signatures for services in development

- Updated dependencies [[`28168cd4`](https://github.com/lemonmade/quilt/commit/28168cd475c8ed1f325494128c86eaa44f676cbe)]:
  - @quilted/graphql@0.4.28

## 0.1.85

### Patch Changes

- Updated dependencies [[`52b01c2e`](https://github.com/lemonmade/quilt/commit/52b01c2e2fca99df929ae095d1be2748609c604b)]:
  - @quilted/graphql@0.4.27

## 0.1.84

### Patch Changes

- [`1f8ffd53`](https://github.com/lemonmade/quilt/commit/1f8ffd53ba84f893dd44ab0879d825b4f783910c) Thanks [@lemonmade](https://github.com/lemonmade)! - Reduce peer dependency warnings

* [#223](https://github.com/lemonmade/quilt/pull/223) [`7041e6be`](https://github.com/lemonmade/quilt/commit/7041e6be1b602efd6348ff6b377f07cf57e43f3c) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplified GraphQL file loading

- [`e3d57269`](https://github.com/lemonmade/quilt/commit/e3d57269978f88af2b72639c5ad054669b57a169) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up package bundle declaration

- Updated dependencies [[`1f8ffd53`](https://github.com/lemonmade/quilt/commit/1f8ffd53ba84f893dd44ab0879d825b4f783910c), [`7041e6be`](https://github.com/lemonmade/quilt/commit/7041e6be1b602efd6348ff6b377f07cf57e43f3c)]:
  - @quilted/graphql@0.4.26
  - @quilted/react-testing@0.5.10

## 0.1.83

### Patch Changes

- [`d5d25fa0`](https://github.com/lemonmade/quilt/commit/d5d25fa001e477f032a85087649793c8c6d5025b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing binary for Craft

## 0.1.82

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

- Updated dependencies [[`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80)]:
  - @quilted/async@0.3.21
  - @quilted/browserslist-config@0.1.6
  - @quilted/eslint-config@0.1.9
  - @quilted/graphql@0.4.25
  - @quilted/polyfills@0.2.23
  - @quilted/prettier@0.2.8
  - @quilted/quilt@0.5.76
  - @quilted/react-testing@0.5.9
  - @quilted/rollup-plugin-fix-commonjs-preserve-modules@0.1.8
  - @quilted/sewing-kit@0.2.24
  - @quilted/typescript@0.2.10
  - @quilted/workers@0.2.20

## 0.1.81

### Patch Changes

- Updated dependencies [[`75012268`](https://github.com/lemonmade/quilt/commit/750122688fd3c42a230239b65635fb42fc523342)]:
  - @quilted/sewing-kit-rollup@0.1.17

## 0.1.80

### Patch Changes

- [`96aa020c`](https://github.com/lemonmade/quilt/commit/96aa020c6a497c973107f34a9d26ac8e4d2eb3df) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix app server dependency bundling

* [`a65c4aa4`](https://github.com/lemonmade/quilt/commit/a65c4aa438a4b3988e1e16bf9c8c58a0b9aaaa23) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix node: module resolution

* Updated dependencies [[`a65c4aa4`](https://github.com/lemonmade/quilt/commit/a65c4aa438a4b3988e1e16bf9c8c58a0b9aaaa23)]:
  - @quilted/sewing-kit-rollup@0.1.16

## 0.1.79

### Patch Changes

- Updated dependencies [[`70dc3a9a`](https://github.com/lemonmade/quilt/commit/70dc3a9a52cec86224017874520e0ec941b8b85f)]:
  - @quilted/polyfills@0.2.22
  - @quilted/quilt@0.5.75

## 0.1.78

### Patch Changes

- [`7bb3292c`](https://github.com/lemonmade/quilt/commit/7bb3292c1e0fa75cb43a965d8da93e8b407f7ee5) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove unnecessary react bundling configuration

* [`06f0aa87`](https://github.com/lemonmade/quilt/commit/06f0aa872f3cd9320b8f84528fa5cc0fa98eb685) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve default externals configuration for services

- [`7890dccd`](https://github.com/lemonmade/quilt/commit/7890dccd6d0952f6a41d217a3b30d71d35f5b648) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix polyfill resolutions

* [`f77bde37`](https://github.com/lemonmade/quilt/commit/f77bde37658273c205980b74cdd53805c56e2d9d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix dependency externalization for services

* Updated dependencies [[`06f0aa87`](https://github.com/lemonmade/quilt/commit/06f0aa872f3cd9320b8f84528fa5cc0fa98eb685), [`433f94f5`](https://github.com/lemonmade/quilt/commit/433f94f56a86a687b5f70a2887a83a3aae25e025), [`7890dccd`](https://github.com/lemonmade/quilt/commit/7890dccd6d0952f6a41d217a3b30d71d35f5b648), [`5bdbcf9c`](https://github.com/lemonmade/quilt/commit/5bdbcf9c298d653dafca4996a5c28ff48829ed4e)]:
  - @quilted/sewing-kit-rollup@0.1.15
  - @quilted/quilt@0.5.74
  - @quilted/polyfills@0.2.21
  - @quilted/workers@0.2.19

## 0.1.77

### Patch Changes

- Updated dependencies [[`4474c4c3`](https://github.com/lemonmade/quilt/commit/4474c4c3a298c9782f4632e54218dc04acd22cca)]:
  - @quilted/async@0.3.20

## 0.1.76

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

- Updated dependencies [[`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f)]:
  - @quilted/async@0.3.19
  - @quilted/browserslist-config@0.1.5
  - @quilted/eslint-config@0.1.8
  - @quilted/graphql@0.4.24
  - @quilted/polyfills@0.2.20
  - @quilted/prettier@0.2.7
  - @quilted/quilt@0.5.73
  - @quilted/react-testing@0.5.8
  - @quilted/sewing-kit@0.2.23
  - @quilted/sewing-kit-babel@0.1.13
  - @quilted/sewing-kit-eslint@0.1.10
  - @quilted/sewing-kit-esnext@0.1.24
  - @quilted/sewing-kit-jest@0.1.15
  - @quilted/sewing-kit-package@0.1.17
  - @quilted/sewing-kit-prettier@0.1.10
  - @quilted/sewing-kit-react@0.1.10
  - @quilted/sewing-kit-rollup@0.1.14
  - @quilted/sewing-kit-targets@0.1.14
  - @quilted/sewing-kit-typescript@0.1.11
  - @quilted/sewing-kit-vite@0.1.11
  - @quilted/typescript@0.2.9
  - @quilted/workers@0.2.18

## 0.1.75

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

- Updated dependencies [[`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5)]:
  - @quilted/async@0.3.18
  - @quilted/browserslist-config@0.1.4
  - @quilted/eslint-config@0.1.7
  - @quilted/graphql@0.4.23
  - @quilted/polyfills@0.2.19
  - @quilted/prettier@0.2.6
  - @quilted/quilt@0.5.72
  - @quilted/react-testing@0.5.7
  - @quilted/sewing-kit@0.2.22
  - @quilted/sewing-kit-babel@0.1.12
  - @quilted/sewing-kit-eslint@0.1.9
  - @quilted/sewing-kit-esnext@0.1.23
  - @quilted/sewing-kit-jest@0.1.14
  - @quilted/sewing-kit-package@0.1.16
  - @quilted/sewing-kit-prettier@0.1.9
  - @quilted/sewing-kit-react@0.1.9
  - @quilted/sewing-kit-rollup@0.1.13
  - @quilted/sewing-kit-targets@0.1.13
  - @quilted/sewing-kit-typescript@0.1.10
  - @quilted/sewing-kit-vite@0.1.10
  - @quilted/typescript@0.2.8
  - @quilted/workers@0.2.17

## 0.1.74

### Patch Changes

- [`0d77da6`](https://github.com/lemonmade/quilt/commit/0d77da67dc2ff288e059ed6331e7fd458efcf4c7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some craft peer dependencies

## 0.1.73

### Patch Changes

- Updated dependencies [[`e2d3ef6`](https://github.com/lemonmade/quilt/commit/e2d3ef636bbe1f0fc951889e1d3dbbbe0073b36b)]:
  - @quilted/sewing-kit@0.2.21

## 0.1.72

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix preact aliases in tests

* [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

* Updated dependencies [[`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8), [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8)]:
  - @quilted/quilt@0.5.70
  - @quilted/react-testing@0.5.6
  - @quilted/async@0.3.17
  - @quilted/graphql@0.4.21
  - @quilted/polyfills@0.2.18
  - @quilted/sewing-kit@0.2.20
  - @quilted/sewing-kit-babel@0.1.11
  - @quilted/sewing-kit-eslint@0.1.8
  - @quilted/sewing-kit-esnext@0.1.22
  - @quilted/sewing-kit-jest@0.1.13
  - @quilted/sewing-kit-package@0.1.15
  - @quilted/sewing-kit-prettier@0.1.8
  - @quilted/sewing-kit-react@0.1.8
  - @quilted/sewing-kit-rollup@0.1.12
  - @quilted/sewing-kit-targets@0.1.12
  - @quilted/sewing-kit-typescript@0.1.9
  - @quilted/sewing-kit-vite@0.1.9
  - @quilted/typescript@0.2.7
  - @quilted/workers@0.2.16

## 0.1.71

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

- Updated dependencies [[`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3)]:
  - @quilted/typescript@0.2.6
  - @quilted/async@0.3.16
  - @quilted/browserslist-config@0.1.3
  - @quilted/eslint-config@0.1.6
  - @quilted/graphql@0.4.20
  - @quilted/polyfills@0.2.17
  - @quilted/prettier@0.2.5
  - @quilted/quilt@0.5.69
  - @quilted/sewing-kit@0.2.19
  - @quilted/sewing-kit-babel@0.1.10
  - @quilted/sewing-kit-eslint@0.1.7
  - @quilted/sewing-kit-esnext@0.1.21
  - @quilted/sewing-kit-jest@0.1.12
  - @quilted/sewing-kit-package@0.1.14
  - @quilted/sewing-kit-prettier@0.1.7
  - @quilted/sewing-kit-react@0.1.7
  - @quilted/sewing-kit-rollup@0.1.11
  - @quilted/sewing-kit-targets@0.1.11
  - @quilted/sewing-kit-typescript@0.1.8
  - @quilted/sewing-kit-vite@0.1.8
  - @quilted/workers@0.2.15

## 0.1.70

### Patch Changes

- [`fb10e01`](https://github.com/lemonmade/quilt/commit/fb10e0181c26b6faedaea6f7fc5d88d7ccccc3d1) Thanks [@lemonmade](https://github.com/lemonmade)! - Add web crypto polyfill

* [`4d3d0fa`](https://github.com/lemonmade/quilt/commit/4d3d0fadd1dc4eedd88198506d4f05f446180430) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some type errors

- [`39fea43`](https://github.com/lemonmade/quilt/commit/39fea43970695c1cf01a680150d2ef672dc4bfb7) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove leftover PRELOAD_ALL global

* [`b8ad988`](https://github.com/lemonmade/quilt/commit/b8ad988692bb3e570169d683ca0143d75ad2a29b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix order of in-repo package aliases

* Updated dependencies [[`fb10e01`](https://github.com/lemonmade/quilt/commit/fb10e0181c26b6faedaea6f7fc5d88d7ccccc3d1), [`33c1a59`](https://github.com/lemonmade/quilt/commit/33c1a59c89fd9aeae81cb6072b4100d706268985), [`4d3d0fa`](https://github.com/lemonmade/quilt/commit/4d3d0fadd1dc4eedd88198506d4f05f446180430)]:
  - @quilted/polyfills@0.2.16
  - @quilted/quilt@0.5.66
  - @quilted/graphql@0.4.19

## 0.1.69

### Patch Changes

- [`1540bbe`](https://github.com/lemonmade/quilt/commit/1540bbed2a418824b3f3d052c45f4ca66dfc2c4c) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix environment variables in development

## 0.1.68

### Patch Changes

- [#190](https://github.com/lemonmade/quilt/pull/190) [`9bf454a`](https://github.com/lemonmade/quilt/commit/9bf454aaefc7ac6b85060fc5493b6b3ee4e2b526) Thanks [@lemonmade](https://github.com/lemonmade)! - Add easy environment variables

- Updated dependencies [[`9bf454a`](https://github.com/lemonmade/quilt/commit/9bf454aaefc7ac6b85060fc5493b6b3ee4e2b526)]:
  - @quilted/quilt@0.5.64

## 0.1.67

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

- Updated dependencies [[`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8)]:
  - @quilted/async@0.3.15
  - @quilted/graphql@0.4.18
  - @quilted/polyfills@0.2.15
  - @quilted/quilt@0.5.63
  - @quilted/sewing-kit@0.2.18
  - @quilted/sewing-kit-babel@0.1.9
  - @quilted/sewing-kit-eslint@0.1.6
  - @quilted/sewing-kit-esnext@0.1.20
  - @quilted/sewing-kit-jest@0.1.11
  - @quilted/sewing-kit-package@0.1.13
  - @quilted/sewing-kit-prettier@0.1.6
  - @quilted/sewing-kit-react@0.1.6
  - @quilted/sewing-kit-rollup@0.1.10
  - @quilted/sewing-kit-targets@0.1.10
  - @quilted/sewing-kit-typescript@0.1.7
  - @quilted/sewing-kit-vite@0.1.7
  - @quilted/workers@0.2.14

## 0.1.66

### Patch Changes

- [#183](https://github.com/lemonmade/quilt/pull/183) [`b1ecbd9`](https://github.com/lemonmade/quilt/commit/b1ecbd9f499262f4509af0705b1a77f0df131c2c) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove quilt:internal support and use aliases instead

- Updated dependencies [[`b1ecbd9`](https://github.com/lemonmade/quilt/commit/b1ecbd9f499262f4509af0705b1a77f0df131c2c), [`b1ecbd9`](https://github.com/lemonmade/quilt/commit/b1ecbd9f499262f4509af0705b1a77f0df131c2c)]:
  - @quilted/sewing-kit@0.2.17
  - @quilted/sewing-kit-jest@0.1.10

## 0.1.65

### Patch Changes

- [`6b1acfd`](https://github.com/lemonmade/quilt/commit/6b1acfd562f6e268c004ab31cfdeaa065696ca88) Thanks [@lemonmade](https://github.com/lemonmade)! - Always use internal condition when it's available

* [`fc1e551`](https://github.com/lemonmade/quilt/commit/fc1e551b6996626d9da8a7466244bcd95fe89a85) Thanks [@lemonmade](https://github.com/lemonmade)! - Use @quilted/quilt in GraphQL types through Craft

* Updated dependencies [[`6b1acfd`](https://github.com/lemonmade/quilt/commit/6b1acfd562f6e268c004ab31cfdeaa065696ca88), [`fc1e551`](https://github.com/lemonmade/quilt/commit/fc1e551b6996626d9da8a7466244bcd95fe89a85)]:
  - @quilted/sewing-kit@0.2.16
  - @quilted/graphql@0.4.17

## 0.1.64

### Patch Changes

- [#181](https://github.com/lemonmade/quilt/pull/181) [`c82cafa`](https://github.com/lemonmade/quilt/commit/c82cafa796feaba7221baed984f7e720b5601a62) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL configuration types

- Updated dependencies [[`c82cafa`](https://github.com/lemonmade/quilt/commit/c82cafa796feaba7221baed984f7e720b5601a62), [`c82cafa`](https://github.com/lemonmade/quilt/commit/c82cafa796feaba7221baed984f7e720b5601a62), [`ba2d282`](https://github.com/lemonmade/quilt/commit/ba2d28245528fc9825e36cfed85798b721f33152)]:
  - @quilted/graphql@0.4.16
  - @quilted/quilt@0.5.62

## 0.1.63

### Patch Changes

- [`a72df6b`](https://github.com/lemonmade/quilt/commit/a72df6b655af4c58e6d9905ba6a37b39fcc69c9b) Thanks [@lemonmade](https://github.com/lemonmade)! - Re-export GraphQL configuration type

## 0.1.62

### Patch Changes

- Updated dependencies [[`23332d0`](https://github.com/lemonmade/quilt/commit/23332d0faf42f58b5a942ded3f524e2857aa09c8)]:
  - @quilted/sewing-kit-vite@0.1.6

## 0.1.61

### Patch Changes

- [`e068c35`](https://github.com/lemonmade/quilt/commit/e068c356d844ef4fb9da2a4dc3889a776dfbfa68) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix pinning versions in @quilted/craft

## 0.1.60

### Patch Changes

- [`370cf69`](https://github.com/lemonmade/quilt/commit/370cf693a8740af928f18939f541b7e30a774b58) Thanks [@lemonmade](https://github.com/lemonmade)! - Another test release!

## 0.1.59

### Patch Changes

- [`7c361b9`](https://github.com/lemonmade/quilt/commit/7c361b9d9d5f32b4227f0e3e739aa2b5a4e37d2b) Thanks [@lemonmade](https://github.com/lemonmade)! - Testing new release flow!

## 0.1.58

### Patch Changes

- [#168](https://github.com/lemonmade/quilt/pull/168) [`ce60ec7`](https://github.com/lemonmade/quilt/commit/ce60ec7d864eb3b7c20a1f6cfe8839652bd8e3db) Thanks [@lemonmade](https://github.com/lemonmade)! - Use app auto server in development

- Updated dependencies [[`ce60ec7`](https://github.com/lemonmade/quilt/commit/ce60ec7d864eb3b7c20a1f6cfe8839652bd8e3db), [`ce60ec7`](https://github.com/lemonmade/quilt/commit/ce60ec7d864eb3b7c20a1f6cfe8839652bd8e3db)]:
  - @quilted/quilt@0.5.61

## 0.1.57

### Patch Changes

- [`091e067`](https://github.com/lemonmade/quilt/commit/091e067ff3240fcb140687d47afce73926ff70ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve safety of magic entrypoints

- Updated dependencies [[`091e067`](https://github.com/lemonmade/quilt/commit/091e067ff3240fcb140687d47afce73926ff70ac)]:
  - @quilted/quilt@0.5.60

## 0.1.56

### Patch Changes

- [`1cb90c3`](https://github.com/lemonmade/quilt/commit/1cb90c382fb7e7e7b4b4e9c66d92c1c689e16ee9) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove unnecessary module directories build augmentation

## 0.1.55

### Patch Changes

- [`a9d3eb2`](https://github.com/lemonmade/quilt/commit/a9d3eb268447b50bb4504584d568fd16df158265) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset manifest creation and types in strict package environments

* [`1cd1f3b`](https://github.com/lemonmade/quilt/commit/1cd1f3b886081f40e7dfe1c2695516faf8e3b536) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix http-handlers imports in strict package environments

- [`d1b0622`](https://github.com/lemonmade/quilt/commit/d1b0622144a2af199c60aaa5d206d82ebc0214bf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React aliasing in strict package environments

* [`6ad3628`](https://github.com/lemonmade/quilt/commit/6ad362860eb65392ec5c5fa80c62e002e7f99f74) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix @quilted/polyfills in strict package environments

* Updated dependencies [[`a9d3eb2`](https://github.com/lemonmade/quilt/commit/a9d3eb268447b50bb4504584d568fd16df158265), [`73c25d2`](https://github.com/lemonmade/quilt/commit/73c25d295614141230c3607e92c8da5342e013d7), [`1cd1f3b`](https://github.com/lemonmade/quilt/commit/1cd1f3b886081f40e7dfe1c2695516faf8e3b536), [`d1b0622`](https://github.com/lemonmade/quilt/commit/d1b0622144a2af199c60aaa5d206d82ebc0214bf), [`6ad3628`](https://github.com/lemonmade/quilt/commit/6ad362860eb65392ec5c5fa80c62e002e7f99f74), [`fbff206`](https://github.com/lemonmade/quilt/commit/fbff206228e2bf4a1a1e07beb63d04f5553b6cf1)]:
  - @quilted/async@0.3.14
  - @quilted/quilt@0.5.59

## 0.1.54

### Patch Changes

- [`0382ee0`](https://github.com/lemonmade/quilt/commit/0382ee00ece65fffa308f91c99b66868a1c0dcdb) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix issue with duplicate Babel plugins

* [`73245f4`](https://github.com/lemonmade/quilt/commit/73245f4df730c32057e4f2d4e0849a3c93a1dddb) Thanks [@lemonmade](https://github.com/lemonmade)! - Normalize "magic" file names to use extensions

- [`beb1b67`](https://github.com/lemonmade/quilt/commit/beb1b675e18e7a981ea29e4a945fcbf0f5e3532d) Thanks [@lemonmade](https://github.com/lemonmade)! - Package Quilt globals in framework bundle

* [`aeabd24`](https://github.com/lemonmade/quilt/commit/aeabd24c0b34d6e20d042af05800acd6d0622f62) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix types for `createAsyncComponent()` in strict dependency installations

## 0.1.53

### Patch Changes

- [#158](https://github.com/lemonmade/quilt/pull/158) [`d9585bb`](https://github.com/lemonmade/quilt/commit/d9585bbc51c25f2d0cba6c656a06c74ed6ed5f93) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve template projects

## 0.1.52

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project

- Updated dependencies [[`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e)]:
  - @quilted/async@0.3.13
  - @quilted/graphql@0.4.15
  - @quilted/quilt@0.5.58
  - @quilted/workers@0.2.13

# Package builds

Quilt provides a default strategy for building packages that optimizes for bundle size in consuming projects. This document describes the different parts of this build, including some changes you have to make to your package’s `package.json`.

For private packages (that is, the package’s `package.json` includes [`"private": true`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#private)), Quilt does not build your package. Any consumers within this repo will use the source code of the package directly, so no build outputs are needed.

For public packages, Quilt creates four different sets of outputs for your project by default, based on the [entries you specify in your `package.json`](./README.md#entries):

- [ESModules build](#esmodules-build), which targets environments supporting native [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [CommonJS build](#commonjs-build), which targets Node’s [CommonJS module format](https://nodejs.org/docs/latest/api/modules.html)
- [ESNext build](#esnext-build), which is a minimally-transformed build that Quilt will use in consuming apps and services to get the smallest possible bundle size
- [TypeScript declarations build](#typescript-declarations-build), which includes TypeScript definition files based on your source files

Quilt provides smart defaults for handling package dependencies during build, but you can also [customize the bundling behavior](#dependency-bundling) for your package to create even more optimized outputs. Quilt can also help you generate [binaries for your package](#binaries).

## ESModules build

Quilt prefers native JavaScript modules whenever possible, so it will always produce an ESModule build of your package. This build transpiles your package’s source code to match your [minimum runtime targets](#runtime-targets), but preserves the native JavaScript modules from your source code.

When creating the ESModules build, Quilt will:

- Create a corresponding ESModule file for each source file in your package,
- Rename it to have a `.mjs` extension, and
- Place it in a `./build/esm` output directory, preserving the original directory structure

For example, with the following source code:

```ts
// ./source/index.ts

export {shout} from './shout';

// ./source/shout.ts

export function shout(message: string) {
  console.log(`${message}!!`);
}
```

The following built files will be created when running [`quilt build`](../../cli/build.md):

```ts
// ./build/esm/index.mjs

export {shout} from './shout.mjs';

// ./build/esm/shout.mjs

export function shout(message) {
  console.log(`${message}!!`);
}
```

In order for consuming apps and services to make use of this build, you need to reference it in your [`package.json`’s `"exports"` field](https://nodejs.org/api/packages.html#exports). We recommend doing so with the [`"import"` conditional export](https://nodejs.org/api/packages.html#conditional-exports), which is used by consuming code that supports ESModules. This condition should be included **below** the [`"source"` or `"quilt:source"` conditional export](./README.md#entries).

The following example shows a package with a “root” entry (`"."`) and a `"testing"` entry, with both the source and ESModules version of the entries referenced:

```json
{
  "exports": {
    ".": {
      "quilt:source": "./source/index.ts",
      "import": "./build/esm/index.mjs"
    },
    "./testing": {
      "quilt:source": "./source/testing.ts",
      "import": "./build/esm/testing.mjs"
    }
  }
}
```

### Runtime targets

When creating the ESModule and CommonJS builds, Quilt will “transpile” your code to remove references to language features that are not supported by your minimum supported runtime versions. The following logic is used to determine the minimum supported runtime version for your package:

- If you explicitly list browsers as a [supported runtime](./README.md#runtimes) for your package, or you do not explicitly set any supported runtimes, Quilt will attempt to read the [browserslist configuration](https://github.com/browserslist/browserslist) for the package. The easiest way to set this supported browser list is to include the [`"browserslist" key in your `package.json`](https://github.com/browserslist/browserslist#packagejson) (you can extend the [`@quilted/browserslist/defaults`](../../../packages/browserslist-config) shared configuration if you want a good, wide browser support matrix):

  ```json
  {
    "browserslist": ["extends @quilted/browserslist-config/defaults"]
  }
  ```

  This configuration can live in any `package.json` file upwards from your package’s root directory. If you have many packages and they all target a common browser support matrix, you may want to move this `"browserslist"` configuration field into the workspace’s `package.json`, instead of the one for each individual package.

  If Quilt can’t find any browserslist configuration for your package, the default browserslist browser support target will be used instead.

- If you explicitly list Node.js as a [supported runtime](./README.md#runtimes) for your package, or you do not explicitly set any supported runtimes, Quilt will attempt to read the minimum supported node version from the [`"engines.node"` key in your `package.json`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#engines). For example, the following package would target any version of Node.js greater than or equal to 14:

  ```json
  {
    "engines": {
      "node": ">=14.0.0"
    }
  }
  ```

  Quilt will look for this field in your package’s `package.json`. If it is not found, Quilt will look for this field in your workspace’s `package.json`. If Quilt does not find a match in either location, the current version of Node.js will be used as a fallback.

When Quilt compiles your code, it may add imports for [`@babel/runtime`](https://babeljs.io/docs/en/babel-runtime). These are added when you use JavaScript runtime features that are not supported by the targets for your package. To signal this possible dependency to your package consumers, you should add `@babel/runtime` as an optional `"peerDependency"`:

```json
{
  "peerDependencies": {
    "@babel/runtime": ">=7.0.0 <8.0.0"
  },
  "peerDependenciesMeta": {
    "@babel/runtime": {
      "optional": true
    }
  }
}
```

An optional peer dependency is recommended because the [ESNext build](#esnext-build) does not generally require these helpers, so the package can function correctly even if `@babel/runtime` is not installed.

## CommonJS build

To support some legacy Node.js tools that don’t fully support ESModules (including [Jest](https://jestjs.io/docs/ecmascript-modules)), Quilt also defaults to producing a CommonJS build. This build applies the same [runtime target transpilation](#runtime-targets) as the ESModules build, but uses `require()` and `module.exports` instead of native JavaScript modules.

When creating the CommonJS build, Quilt will:

- Create a corresponding CommonJS file for each source file in your package,
- Rename it to have a `.cjs` extension, and
- Place it in a `./build/cjs` output directory, preserving the original directory structure

For example, with the following source code:

```ts
// ./source/index.ts

export {shout} from './shout';

// ./source/shout.ts

export function shout(message: string) {
  console.log(`${message}!!`);
}
```

The following built files will be created when running [`quilt build`](../../cli/build.md):

```ts
// ./build/cjs/index.cjs

Object.defineProperty(exports, '__esModule', {value: true});

var shout = require('./shout.cjs');

exports.shout = shout.shout;

// ./build/cjs/shout.cjs

function shout(message) {
  console.log(`${message}!!`);
}

exports.shout = shout;
```

In order for consuming apps and services to make use of this build, you need to reference it in your [`package.json`’s `"exports"` field](https://nodejs.org/api/packages.html#exports). We recommend doing so with the [`"require"` conditional export](https://nodejs.org/api/packages.html#conditional-exports), which is used by consuming code that prefers CommonJS modules. This condition should be included **below** the [`"source"`, `"quilt:source"`, and `"import"` conditional exports](./README.md#entries).

The following example shows a package with a “root” entry (`"."`) and a `"testing"` entry, with the source, ESModules, and CommonJS versions of the entries referenced:

```json
{
  "exports": {
    ".": {
      "quilt:source": "./source/index.ts",
      "import": "./build/esm/index.mjs",
      "require": "./build/cjs/index.cjs"
    },
    "./testing": {
      "quilt:source": "./source/testing.ts",
      "import": "./build/esm/testing.mjs",
      "require": "./build/cjs/testing.cjs"
    }
  }
}
```

### Disabling the CommonJS build

If you do not need your package to support CommonJS, you can disable it by passing `false` for the `build.commonjs` option of `quiltPackage()` in your package’s `quilt.project.ts`:

```ts
// ./packages/my-package/quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      build: {commonjs: false},
    }),
  );
});
```

If you disable this build, you **should not** include the `"require"` conditional export in your package’s `package.json`.

## ESNext build

As noted in the previous sections, Quilt will transpile both your ESModules and CommonJS builds to match your package’s [minimum runtime targets](#runtime-targets). This is useful because it means that consumers can directly use your library, without needing to process it with any additional build tooling. However, it can be a bit of a performance issue for consuming code: if that code targets a more restricted set of runtime targets, your library may have compiled code unnecessarily.

To address this issue, Quilt will also default to producing a special “esnext” build. This build outputs valid JavaScript code, using native JavaScript modules, but with the absolute minimum amount of transpilation applied. When you use Quilt to build an [app](../apps/) or [service](../services/), it will prefer this ESNext build, and will apply the exact same transformations to this code as it does to your project’s source code.

When creating the ESNext build, Quilt will:

- Create a corresponding ESModules file for each source file in your package,
- Rename it to have a `.esnext` extension, and
- Place it in a `./build/esnext` output directory, preserving the original directory structure

For example, with the following source code:

```ts
// ./source/index.ts

export {shout} from './shout';

// ./source/shout.ts

export function shout(message: string) {
  console.log(`${message}!!`);
}
```

The following built files will be created when running [`quilt build`](../../cli/build.md):

```ts
// ./build/esnext/index.esnext

export {shout} from './shout.esnext';

// ./build/esnext/shout.esnext

export function shout(message) {
  console.log(`${message}!!`);
}
```

In order for consuming apps and services to make use of this build, you need to reference it in your [`package.json`’s `"exports"` field](https://nodejs.org/api/packages.html#exports). Quilt requires that you use the [`"quilt:esnext"` conditional export](https://nodejs.org/api/packages.html#conditional-exports) for this build. This condition should be included **below** the [`"source"` and `"quilt:source"` conditional exports](./README.md#entries), but above the `"import"` and `"require"` conditional exports (if present).

The following example shows a package with a “root” entry (`"."`) and a `"testing"` entry, with the source, ESModules, CommonJS, and ESNext versions of the entries referenced:

```json
{
  "exports": {
    ".": {
      "quilt:source": "./source/index.ts",
      "quilt:esnext": "./build/esnext/index.esnext",
      "import": "./build/esm/index.mjs",
      "require": "./build/cjs/index.cjs"
    },
    "./testing": {
      "quilt:source": "./source/testing.ts",
      "quilt:esnext": "./build/esnext/testing.esnext",
      "import": "./build/esm/testing.mjs",
      "require": "./build/cjs/testing.cjs"
    }
  }
}
```

## TypeScript declarations build

## Dependency bundling

## Binaries

## Advanced build concepts

### Source files

### Side effects

### JSX compilation

## Complete example

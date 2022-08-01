# Package builds

Quilt provides a default strategy for building packages that optimizes for bundle size in consuming projects. This document describes the different parts of this build, including some changes you have to make to your package’s `package.json`.

> **Note:** For private packages (that is, the package’s `package.json` includes [`"private": true`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#private)), Quilt does not build your package. Any consumers within this repo will use the source code of the package directly, so no build outputs are needed. You will still need to [configure the entry files](#using-private-packages-in-a-monorepo) for your private packages, though.

For public packages, Quilt creates four different sets of outputs for your project by default, based on the [entries you specify in your `package.json`](./README.md#entries):

- [ESModules build](#esmodules-build), which targets environments supporting native [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [CommonJS build](#commonjs-build), which targets Node’s [CommonJS module format](https://nodejs.org/docs/latest/api/modules.html)
- [ESNext build](#esnext-build), which is a minimally-transformed build that Quilt will use in consuming apps and services to get the smallest possible bundle size
- [TypeScript declarations build](#typescript-declarations-build), which includes TypeScript definition files based on your source files

Quilt provides smart defaults for handling package dependencies during build, but you can also [customize the bundling behavior](#dependency-bundling) for your package to create even more optimized outputs. Quilt can also help you generate [executable files for your package](#executable-files).

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

> **Note:** because the native JavaScript module format is the default version preferred by this package, we recommend setting the [`"type"` field in your `package.json` to `"module"`](https://nodejs.org/api/packages.html#type):
>
> ```json
> {
>   "name": "my-package",
>   "type": "module"
> }
> ```

### Runtime targets

When creating the ESModule and CommonJS builds, Quilt will “transpile” your code to remove references to language features that are not supported by your minimum supported runtime versions. The following logic is used to determine the minimum supported runtime version for your package:

- If you explicitly list browsers as a [supported runtime](./README.md#runtimes) for your package, or you do not explicitly set any supported runtimes, Quilt will attempt to read the [browserslist configuration](https://github.com/browserslist/browserslist) for the package. The easiest way to set this supported browser list is to include the [`"browserslist"` key in your `package.json`](https://github.com/browserslist/browserslist#packagejson) (you can extend the [`@quilted/browserslist/defaults`](../../../packages/browserslist-config) shared configuration if you want a good, wide browser support matrix):

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

### Disabling the ESNext build

If you do not want the ESNext build, you can disable it by passing `false` for the `build.esnext` option of `quiltPackage()` in your package’s `quilt.project.ts`:

```ts
// ./packages/my-package/quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      build: {esnext: false},
    }),
  );
});
```

If you disable this build, you **should not** include the `"quilt:esnext"` conditional export in your package’s `package.json`.

## TypeScript declarations build

For TypeScript consumers to use your package, you need to provide type definitions for your package. Unlike the other build outputs described in this document, TypeScript outputs are not generated per-project. Instead, Quilt recommends using [TypeScript project references](../../technology/typescript.md). When you run `quilt build`, Quilt knows to run the TypeScript type checker on your entire workspace (assuming you have a Quilt configuration using the [`quiltWorkspace`](../README.md#defining-your-workspace-and-projects) plugin), which will generate type definitions for all projects in the workspace.

For each project in your workspace, you will also need to configure how and where TypeScript will produce type definitions. At the root of each project written in TypeScript, you should have a `tsconfig.json`. We recommend including at least the following options for projects that use Quilt:

```jsonc
{
  // Tells TypeScript where to look for your TypeScript source files. If you want to structure
  // your package differently (for example, you put your source files in a `src` instead), update
  // this pattern to match where you actually keep your files.
  // Learn more: https://www.typescriptlang.org/tsconfig#include
  "include": ["source"],
  "compilerOptions": {
    // Enables TypeScript project references. These allow TypeScript to generate the type definitions
    // for your workspace more quickly, because only projects that change need to be recompiled.
    // Learn more: https://www.typescriptlang.org/tsconfig#composite
    "composite": true,
    // Tells TypeScript where to output type definitions. You can change this to any path you prefer,
    // but the rest of the examples in this section assume you use `build/typescript`.
    // Learn more: https://www.typescriptlang.org/tsconfig#outDir
    "outDir": "build/typescript",
    // Tells TypeScript the root directory of your source files, which allows it to avoid unnecessary
    // nesting in the generated type definition files. If you keep your source files in a different
    // directory, change this option to the relative path from the `tsconfig.json` file to your source
    // files.
    // Learn more: https://www.typescriptlang.org/tsconfig#rootDir
    "rootDir": "source",
    // Tells TypeScript to generate type definition files (files ending in `.d.ts`).
    // Learn more: https://www.typescriptlang.org/tsconfig#declaration
    "declaration": true,
    // Tells TypeScript to generate source maps that link the `.d.ts` type definition files
    // back to your source files. This allows consumers to jump to your package’s source files
    // when inspecting its types, rather than the type definition files.
    // Learn more: https://www.typescriptlang.org/tsconfig#declarationMap
    "declarationMap": true,
    // Tells TypeScript to only generate type definitions, not JavaScript (`.js`) files.
    // Quilt uses a separate build step to generate the JavaScript outputs for your project,
    // as described in earlier sections, so you don’t need TypeScript’s JavaScript outputs.
    // Learn more: https://www.typescriptlang.org/tsconfig#emitDeclarationOnly
    "emitDeclarationOnly": true
  }
}
```

The [`@quilted/typescript` package](../../../packages/typescript) provides a collection of shared TypeScript configuration files you can use to automatically enable most of this configuration. The configuration above can be achieved more simply by relying on the `@quilted/typescript/project.json` shared configuration:

```jsonc
{
  "extends": "@quilted/typescript/project.json",
  // You must still set the `include`, `rootDir`, and `outDir` options. The shared configuration
  // does not set these since they are relative to the root of your project, and because you may
  // want to change the structure of your package’s source files.
  "include": ["source"],
  "compilerOptions": {
    "rootDir": "source",
    "outDir": "build/typescript"
  }
}
```

Once these type definition files are being created successfully (you can verify that your configuration is working as expected by running `quilt build` or [`quilt type-check`](../../cli/type-check.md) and checking the directory you specified with the `outDir` option), you need to update your `package.json` so consuming projects will see them.

TypeScript recently [introduced support](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#packagejson-exports-imports-and-self-referencing) for the [`package.json` `"exports"` field](https://nodejs.org/api/packages.html#exports), but consumers with older versions of TypeScript will have issues if you only use the new `type` [export condition](https://nodejs.org/api/packages.html#conditional-exports). For now, you will need to provide two separate mappings for type definition files: one using the `exports` field, and the other using an older TypeScript feature called [`typesVersions`](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions).

The following example shows a package with a “root” entry (`"."`) and a `"testing"` entry, using both TypeScript declaration mappings, in addition to all the JavaScript export conditions described in earlier sections:

```json
{
  "exports": {
    ".": {
      "types": "./build/typescript/index.d.ts",
      "quilt:source": "./source/index.ts",
      "quilt:esnext": "./build/esnext/index.esnext",
      "import": "./build/esm/index.mjs",
      "require": "./build/cjs/index.cjs"
    },
    "./testing": {
      "types": "./build/typescript/testing.d.ts",
      "quilt:source": "./source/testing.ts",
      "quilt:esnext": "./build/esnext/testing.esnext",
      "import": "./build/esm/testing.mjs",
      "require": "./build/cjs/testing.cjs"
    }
  },
  "types": "./build/typescript/index.d.ts",
  "typeVersions": {
    "*": {
      "testing": "./build/typescript/testing.d.ts"
    }
  }
}
```

If you only have a “root” entrypoint, you can omit the `"typesVersions"` field. If you have more entrypoints for your package, you would include each as an additional key in the `typesVersions.*` object, like `"testing"` in the example above.

## Executable files

So far, we have only looked at entrypoints into your package — parts of your package that consumers can import for use in their own projects. However, a package may want to provide executable files that a developer can run directly, either as the only thing the package does or in addition to importable code. Quilt can also help you with generating these files.

To get started, you will need to teach Quilt what source code in your project should be treated as an executable, and what the name of that executable will be. In an executable package’s `quilt.project.ts` file, update the `quiltProject()` plugin to include a mapping of executable modules:

```ts
// ./packages/my-package/quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      executable: {
        'my-executable': './source/index.ts',
      },
    }),
  );
});
```

When you run `quilt build`, Quilt will generate an executable file for each entry in this mapping, placing the output in the `bin` directory at the root of your package. These executables will reference the [ESModules build](#esmodules-build) for your project; in order for this to work, the resulting executable files will have `.mjs` file extensions.

To expose these executable files to consuming projects, you will need to list them in your [`package.json`’s `"bin"` field](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bin):

```json
{
  "bin": {
    "my-executable": "./bin/my-executable.mjs"
  }
}
```

## Complete example

The example below shows a complete example of a package’s configuration files. It references all of Quilt’s build outputs, and like other examples in this guide, includes both a “root” entry (`"."`) and a `"testing"` entry:

```jsonc
// package.json
{
  "name": "my-package",
  "type": "module",
  "version": "1.0.0",
  "exports": {
    ".": {
      "types": "./build/typescript/index.d.ts",
      "quilt:source": "./source/index.ts",
      "quilt:esnext": "./build/esnext/index.esnext",
      "import": "./build/esm/index.mjs",
      "require": "./build/cjs/index.cjs"
    },
    "./testing": {
      "types": "./build/typescript/testing.d.ts",
      "quilt:source": "./source/testing.ts",
      "quilt:esnext": "./build/esnext/testing.esnext",
      "import": "./build/esm/testing.mjs",
      "require": "./build/cjs/testing.cjs"
    }
  },
  "types": "./build/typescript/index.d.ts",
  "typeVersions": {
    "*": {
      "testing": "./build/typescript/testing.d.ts"
    }
  },
  "sideEffects": false
}
```

```jsonc
// tsconfig.json
{
  "extends": "@quilted/typescript/project.json",
  "include": ["source"],
  "compilerOptions": {
    "rootDir": "source",
    "outDir": "build/typescript"
  }
}
```

> **Note:** if you want a shortcut that lets you skip most of this manual work, you can use [Quilt’s `create` command to build your package](../../getting-started.md#creating-a-package).

## Advanced build concepts

### Using `private` packages in a monorepo

If you do not intend to publish a package for use in other workspaces, you should set the [`"private": true` in the package’s `package.json`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#private). When you do so, Quilt will not perform any of the builds described here, since any consuming projects in the same workspace can use the source code of the package instead of compiled outputs.

For other projects to find the correct source files to use for your package, you will still need to provide some module mappings in the package’s `package.json`. However, the mappings can be significantly simpler than projects that produce built outputs. The following example shows a private package with a “root” entry (`"."`) and a `"testing"` entry:

```json
{
  "exports": {
    ".": "./source/index.ts",
    "./testing": "./source/testing.ts"
  },
  "types": "./build/typescript/index.d.ts",
  "typeVersions": {
    "*": {
      "testing": "./build/typescript/testing.d.ts"
    }
  }
}
```

In the example above, we’ve included the [`"typesVersions"` mapping for older TypeScript versions](). If your project only has single entry, and uses [TypeScript’s support for the `"exports"` field](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#packagejson-exports-imports-and-self-referencing), you can omit both the `"types"` and `"typesVersions"` fields.

### Tree shaking

Tree shaking refers to the process of a consuming app or service being able to exclude parts of a package it does not use, keeping only the minimal amount of necessary code. The builds performed by Quilt are configured to maximize their “tree shakability”.

Native JavaScript modules are necessary for tree shaking, as they can be statically analyzed by bundlers. As noted above, Quilt always generates an [ESModules build](#esmodules-build), as well as a special [“ESNext” build](#esnext-build) that can be optimized even further.

By default, all of Quilt’s builds will preserve your source module structure. This is important because most JavaScript bundlers can only remove unused code on module boundaries; few are able to remove unused code _within_ a particular module.

To get tree shaking working optimally in most bundlers, you will need to add the [`"sideEffects"` field](https://webpack.js.org/guides/tree-shaking/) to your `package.json`. The simplest configuration of this field is to set it to `false`, which tells bundlers that all files are safe to remove from consuming applications, if they are not otherwise used:

```json
{
  "sideEffects": false
}
```

### Dependency bundling

Bundling dependencies refers to the process of embedding the code for some of your dependencies into the built output of your package. A package that bundles its dependencies does not need to list those dependencies in the `"dependencies"` field of its `package.json`; the package will always use the bundled code instead.

Bundling some of the dependencies with your package can be useful for a few reasons:

- Guarantees the version of a particular dependency is used at runtime
- Minimizes the number of dependencies your package has, which can make it easier for consumers to install
- In some cases, optimizes the performance of importing the code from dependencies

There is a downside, though: consumers can’t rely on their dependency manager to deduplicate the same package across all the packages they use. You should only use this technique for dependencies you are confident that consumers will not need separately from your package.

When Quilt builds your project, any dependencies you list in `"devDependencies"` (as opposed to `"dependencies"` or `"peerDependencies"`) will be bundled into your project. Change a dependency from being listed in `"dependencies"` to instead be listed in `"devDependencies"`, and Quilt will take care of the rest!

If you’d like to force all dependencies to be bundled instead of just development dependencies, you can set the `build.bundle` option to `true` in your package’s `quiltPackage()` plugin:

```ts
// quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      build: {
        bundle: true,
      },
    }),
  );
});
```

This `bundle` option also accepts a more complex structure that lets you deeply customize which dependencies are and aren’t bundled. For more details, see the [`rollup-plugin-node-externals` plugin documentation](https://github.com/Septh/rollup-plugin-node-externals), which is used to perform this selective bundling. Note that, because Quilt frames this option as which dependencies are bundled, you pass the opposite options as you would to `rollup-plugin-node-externals`, which frames the option in terms of which dependencies are “externalized”. So, for example, if you want to bundle only a special `my-bundled-dependency` package, you would pass the following options:

```ts
// quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      build: {
        bundle: {
          // In rollup-plugin-node-externals, these would both be `true` instead
          dependencies: false,
          devDependencies: false,
          // In rollup-plugin-node-externals, this would be passed as the `exclude` option instead
          include: ['my-bundled-dependency'],
        },
      },
    }),
  );
});
```

### Source files

In some guides, you will see advice to exclude your source files from the list of files that are distributed in your package. This is often done either with the [`"files"` list in `package.json`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#files), or with a [`.npmignore` file](https://npm.github.io/publishing-pkgs-docs/publishing/the-npmignore-file.html).

Quilt instead recommends that you **include** source files with your published package. Doing so increases the amount of code a consumer needs to download, but it ensures that go-to-definition navigates right into source code for TypeScript consumers.

### React and JSX

Quilt supports packages that use JSX to author React components. Any JSX is compiled to React’s [more modern JSX transform](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html). For example, the following source code would produce the built version below it:

```tsx
// source/index.tsx

export function Emphasize({children}: {children: string}) {
  return <strong>{children}!</strong>;
}
```

```js
import {jsx} from 'react/jsx-runtime';

export function Emphasize({children}) {
  return jsx('strong', {children: [children, '!']});
}
```

The `react/jsx-runtime` entry is only available in React version 17 and up. Your package should therefore list `react` as a peer dependency with a minimum version of `17.0.0`. You may also want to mark `react` as an optional peer dependency (using [`"peerDependenciesMeta"`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#peerdependenciesmeta)), since consumers may alias `react` to a different package, like [`preact`](../../technology/preact.md):

```json
{
  "peerDependencies": {
    "react": ">=17.0.0 <19.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  }
}
```

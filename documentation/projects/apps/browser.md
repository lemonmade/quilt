# Browser builds

Quilt’s bread and butter is building web applications. If you use [Craft](./TODO), Quilt’s build tool, you’ll get browser builds that have been heavily optimized for performance out of the box. Quilt also provides a few configuration options for customizing the browser entrypoint, browsers targets, and other details about your application’s assets.

> **Note:** like all of Quilt’s builds, application builds are powered by [Rollup](https://rollupjs.org/guide/en/). If you want to customize the build, you’ll often do so with custom Rollup plugins. You can learn more about customizing Rollup through Craft in the [`@quilted/sewing-kit-rollup` package documentation](https://github.com/lemonmade/quilt/tree/main/packages/sewing-kit-rollup).

## Assets

Quilt builds all your assets into a `build/assets` directory inside the root of your application’s root directory. This includes the bundled JavaScript and CSS for your application, as well as static asset files like `.png` and `.svg` that you import in your source code.

We recommend ignoring the `build` directory in version control so that you don’t accidentally commit these built files.

### Customizing assets

You can customize the assets that are loaded in the browser by passing an `assets` option to the [`quiltApp` Craft plugin](./TODO). You can currently provide the following options:

- `minify`: Determines whether the assets built by Quilt will be minified. Defaults to `true`.
- `baseUrl`: The base URL where your assets will be hosted in production. By default, this is set to `/assets/`, which means that assets are assumed to be served from the `/assets/` path of your application domain.
- `inline`: The settings to use for inlining static assets into your JavaScript by bundle. By default, Quilt will transform imports of small image files into base64 data URIs, instead of creating a dedicated file for them in your build. You can pass `false` to disable this behavior, or pass `{limit: number}` to the maximum file size that will be inlined.

The example below shows how you could use the `assets` option to change the `baseUrl` to a dedicated CDN URL, which you would do if you host your assets separately from your application:

```ts
// quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';

export default createProject((app) => {
  app.use(
    quiltApp({
      assets: {baseUrl: 'https://my-cdn.com/my-app/assets/'},
    }),
  );
});
```

The example below shows how you can use the `assets.inline` option to fully disable asset inlining:

```ts
// quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';

export default createProject((app) => {
  app.use(
    quiltApp({
      assets: {inline: false},
    }),
  );
});
```

#### Customizing the browser builds with Craft

Quilt provides fine-grained control over the browser entry through a collection of [Craft hooks](./TODO). The following hooks are available for the [`build` task](./TODO):

- `quiltAssetBaseUrl`: customizes the base URL used for assets in your application. This value will be appended to any assets built by Quilt. The default is `/assets/`.
- `quiltAssetStaticExtensions`: the file extensions that will be considered as static assets. Defaults to a list of common static asset extensions.
- `quiltAssetStaticInlineLimit`: customizes the maximum size for static assets that will be inlined into your JavaScript bundles.
- `quiltAssetStaticOutputFilenamePattern`: customizes the filename pattern used when creating output files for your static assets.

The example below shows how you can write a custom Craft plugin that uses the `quiltAssetStaticOutputFilenamePattern` hook to nest static assets under an `images` directory in your build outputs:

```ts
// quilt.project.ts

import {createProject, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createProject((app) => {
  app.use(quiltApp());
  app.use(
    createProjectPlugin({
      name: 'MyApp.CustomizeStaticAssetPattern',
      build({configure}) {
        configure(({quiltAssetStaticOutputFilenamePattern}) => {
          quiltAssetStaticOutputFilenamePattern?.(
            (pattern) => `images/${pattern}`,
          );
        });
      },
    }),
  );
});
```

## Browser entrypoint

When you [create an app with Quilt](./TODO), you might be surprised to find that there are no calls to React DOM’s [`createRoot()` or `hydrateRoot()` functions](https://reactjs.org/docs/react-dom-client.html) anywhere in the template code. Instead, Quilt defaults the “entry point” of your application to an `App` component. This is an intentional design decision — Quilt is a [component-focused framework](./TODO), which means that it provides all the capabilities you typically need when building an application as component-friendly APIs.

When you leave this default setup in place, Quilt will automatically create a browser entry for you that will set up a tiny `Quilt` runtime, and render your application into a DOM element with `id="app"`. This automatic browser entry takes into account the version of React you use, and will automatically use hydration when you are also using the [app server](./server.md).

### Replacing the default entrypoint

The default browser entrypoint is quite simple, and there are many common cases where you may want to customize it. For example, you might want to initialize an error reporting library as early as possible, or you might want to start some workers as your React application boots. You can customize the entry by passing the `browser` option to the `quiltWebApp` plugin in your app’s `quilt.project.ts`. The `browser` option lets you specify an `entry` field, which is a path to a file to use as the browser entrypoint of your application.

As an example, let’s say you want to bootstrap an error reporting library before your application renders. You can do this by providing the `entry` option that points at a file in your application:

```ts
// quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';

export default createProject((app) => {
  app.use(
    quiltApp({
      // `entry` is like an import — it is relative to this file
      browser: {entry: './browser.tsx'},
    }),
  );
});
```

Then, in the referenced file, you can provide all the custom initialization logic, followed by the basic React code required to render your application in the browser:

```ts
// Make sure to include this import if you are using Quilt’s async features
import '@quilted/quilt/globals';

import {ErrorLogging} from 'my-error-logging-library/browser';

// If you are not server rendering, swap this out with `renderRoot` instead
import {hydrateRoot} from 'react-dom/client';

import App from './App.tsx';

ErrorLogging.start();

const element = document.querySelector('#root')!;

hydrateRoot(element, <App />);
```

### Dependency bundles

Quilt creates separate bundles for code in your application that act as global dependencies. You’ll notice this effect in your production application by the names of your JavaScript bundles. Quilt uses the following rules to name your dependency bundles:

- The `framework` bundle contains Quilt and Preact, the code that makes Quilt work
- The `polyfills` bundle contains any [polyfills that you have enabled](../../features/performance.md#polyfills)
- The `loader` bundle contains the [System.js loader code](https://github.com/systemjs/systemjs) (only present for browser builds that can’t use native ES modules)
- `packages` bundles will be created for code in the `packages` directory of your workspace, which is the [default location Quilt puts packages in monorepo workspaces](TODO)
- `global` bundles will be created for code in the `global` directory of your workspace, which is the [conventional location for code shared across your entire repo](TODO)
- `shared` bundles will be created for code in the `shared` directory of your app, which is the [conventional location for code shared by multiple features of your app](./conventions.md#shared)
- The `internals` bundle is used for some internal Quilt dependencies that need to be split into separate bundles

When using Quilt’s [server rendering](./server.md) and [static rendering](./static.md) features, you won’t need to worry too much about the way these assets are split. These modes automatically include the correct bundles in your HTML, and Quilt will preload the necessary dependency bundles when loading your code at runtime.

### Customizing the browser builds with Craft

Quilt provides fine-grained control over the browser entry through a collection of [Craft hooks](./TODO). The following hooks are available:

- `quiltAppBrowserEntryShouldHydrate`: customizes whether the browser entry should use hydration or rendering to initialize your app. If you provided `browser.entryModule`, this hook is not run, as the `browser.entryModule` is used for rendering logic instead.
- `quiltAppBrowserEntryCssSelector`: customizes the CSS selector that finds the DOM node your app is rendered into. If you provided `browser.entryModule`, this hook is not run, as the `browser.entryModule` is used for rendering logic instead.
- `quiltAppBrowserEntryContent`: customizes the full content of the browser entry, after both the `browser` option and the default logic provided by Quilt have been resolved.

The example below shows how you can write a custom Craft plugin that uses the `quiltAppBrowserEntryCssSelector` hook to change just the CSS selector used to target the application:

```ts
// quilt.project.ts

import {createProject, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createProject((app) => {
  app.use(quiltApp());
  app.use(
    createProjectPlugin({
      name: 'MyApp.CustomizeSelector',
      build({configure}) {
        configure(({quiltAppBrowserEntryCssSelector}) => {
          quiltAppBrowserEntryCssSelector?.(() => '#root');
        });
      },
    }),
  );
});
```

When Quilt is building the browser version of your app, it sets the `quiltAppBrowser` option to an object that describes the browser build being produced. You can use the presence of this option to perform tooling customizations that only apply to the browser build:

```ts
// quilt.project.ts

import {createProject, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createProject((app) => {
  app.use(quiltApp());
  app.use(
    createProjectPlugin({
      name: 'MyApp.CustomizeBuild',
      build({configure}) {
        configure(({rollupPlugins}, {quiltAppBrowser}) => {
          if (!quiltAppBrowser) return;

          rollupPlugins?.(addMyBrowserOnlyRollupPlugins);
        });
      },
    }),
  );
});
```

## Browser targets

Your application runs in lots of different browsers, with varying sets of supported language features and DOM APIs. Quilt lets you author using any language feature supported by TypeScript, and takes care of building multiple versions of your application for different browser targets.

Each build intelligently optimizes itself for the target browsers:

- If all browsers in a given target support native ES modules, Quilt will use them (if some browsers in the group don’t support ES modules, Quilt instead uses [System.js](https://github.com/systemjs/systemjs) for loading code)
- Only the language features that are not supported in your target browsers are compiled (using [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env))
- Quilt will conditionally omit [feature polyfills](./TODO) that are fully supported by your target browsers

This process, sometimes called “differential serving”, lets users with more modern browsers receive smaller bundle sizes thanks to fewer features needing transpilation or polyfilling.

By default, Quilt produces three browser builds for your application:

- One targeting a wide swath of in-use browsers (excludes IE 11) (`default`)
- One targeting the browsers that natively support ES modules (`modules`)
- One targeting the last one version of Chrome, Firefox, Safari, and Edge (`evergreen`)

If you are using [automatic server generation](./server.md) for your application, that server will read the user agent string and select the correct assets to use for each individual request.

You can customize what builds get produced for your application by including a [browserslist configuration](https://github.com/browserslist/browserslist) in your application. This configuration can be placed in any of the [supported browserslist configuration files](https://github.com/browserslist/browserslist#config-file), but we generally recommend putting it in the app’s `package.json`. For example, the following browserslist configuration, placed in your app’s `package.json`, would use the `modules` and `evergreen` targets described above, but would use a default build that includes support for IE 11:

```json
{
  "browserslist": {
    "defaults": ["defaults", "IE 11"],
    "modules": ["defaults and fully supports es6-module-dynamic-import"],
    "evergreen": [
      "last 1 firefox version",
      "last 1 safari version",
      "last 1 edge version",
      "last 1 chrome version"
    ]
  }
}
```

Each named configuration will be turned into a build, with the name being included in the resulting file for easy identification (e.g., `app.evergreen.abc123.js`).

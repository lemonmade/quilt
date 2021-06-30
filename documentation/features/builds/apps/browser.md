# Browser builds

Quilt’s bread and butter is building web applications. If you use [Sewing Kit](./TODO), Quilt’s build tool, you’ll get browser builds that have been heavily optimized for performance out of the box. Quilt also provides a few configuration options for customizing the browser entrypoint, browsers targets, and other details about your application’s assets.

> **Note:** like all of Quilt’s builds, application builds are powered by [Rollup](https://rollupjs.org/guide/en/). If you want to customize the build, you’ll often do so with custom Rollup plugins. You can learn more about customizing Rollup through Sewing Kit in the [`@quilted/sewing-kit-rollup` package documentation](https://github.com/lemonmade/quilt/tree/main/packages/sewing-kit-rollup).

## Assets

Quilt builds all your assets into a `build/assets` directory inside the root of your application’s root directory. We recommend ignoring the `build` directory in version control so that you don’t accidentally commit these built files.

### Customizing assets

You can customize the assets that are loaded in the browser by passing an `assets` option to the [`quiltApp` Sewing Kit plugin](./TODO). You can currently provide the following options:

- `minify`: Determines whether the assets built by Quilt will be minified. Defaults to `true`.
- `baseUrl`: The base URL where your assets will be hosted in production. By default, this is set to `/assets/`, which means that assets are assumed to be served from the `/assets/` path of your application domain.

The example below shows how you could use the `assets` option to change the `baseUrl` to a dedicated CDN URL, which you would do if you host your assets separately from your application:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(
    quiltApp({
      assets: {baseUrl: 'https://my-cdn.com/my-app/assets/'},
    }),
  );
});
```

## Browser entrypoint

When you [create an app with Quilt](./TODO), you might be surprised to find that there are no calls to React’s `render()` or `hydrate()` methods anywhere in the template code. Instead, Quilt defaults the “entry point” of your application to an `App` component. This is a very intentional design decision — Quilt is a [component-focused framework](./TODO), which means that it provides all the capabilities you typically need when building an application as component-friendly APIs.

When you leave this default setup in place, Quilt will automatically create a browser entry for you that will set up a tiny `Quilt` runtime, and render your application into a DOM element with `id="app"`. This automatic browser entry takes into account the version of React you use, and will automatically use hydration when you are also using the [automatic app server](./server.md).

### Replacing the default entrypoint

The default entrypoint is quite simple, and there are many common cases where you may want to customize it. For example, you might want to initialize an error reporting library as early as possible, or you might want to start some workers as your React application boots. You can customize the entry by passing the `browser` option to the `quiltWebApp` plugin in your app’s `sewing-kit.config.ts`. The `browser` option lets you specify two modules (files) that customize the default browser entrypoint:

- `initializeModule`, which will be imported before anything else in the browser entry. Use this for code that must run as early as possible.
- `entryModule`, which will be imported after the Quilt runtime has been installed, and will be used in place of the default rendering content. Use this if you want to completely replace the rendering code in the default browser entrypoint.

Let’s say you want to bootstrap an error reporting library before your application renders. You can do this by providing the `initializeModule` option that points at a file in your application:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(
    quiltApp({
      // `initializeModule` can be an absolute or relative path, and like an
      // import in your source code, it can omit the file extension. If you
      // use a relative path, like we do here, it should be relative to this
      // configuration file.
      browser: {initializeModule: './browser/bootstrap'},
    }),
  );
});
```

Then, in the referenced file, you can provide all the custom initialization logic, using all the same features as you can in your “normal” app code:

```ts
import {ErrorLogging} from 'my-error-logging-library/browser';

ErrorLogging.start();
```

### Customizing the browser builds with Sewing Kit

Quilt provides fine-grained control over the browser entry through a collection of [Sewing Kit hooks](./TODO). The following hooks are available:

- `quiltAppBrowserEntryShouldHydrate`: customizes whether the browser entry should use hydration or rendering to initialize your app. If you provided `browser.entryModule`, this hook is not run, as the `browser.entryModule` is used for rendering logic instead.
- `quiltAppBrowserEntryCssSelector`: customizes the CSS selector that finds the DOM node your app is rendered into. If you provided `browser.entryModule`, this hook is not run, as the `browser.entryModule` is used for rendering logic instead.
- `quiltAppBrowserEntryContent`: customizes the full content of the browser entry, after both the `browser` option and the default logic provided by Quilt have been resolved.

The example below shows how you can write a custom Sewing Kit plugin that uses the `quiltAppBrowserEntryCssSelector` hook to change just the CSS selector used to target the application:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
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
// sewing-kit.config.ts

import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
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

You can customize what builds get produced for your application by including a [browserslist configuration](https://github.com/browserslist/browserslist) in your application. This configuration can be placed in any of the [supported browserslist configuration files](https://github.com/browserslist/browserslist#config-file), but we generally recommend putting it in the app’s `package.json`.

Quilt provides the default targets it uses through the [`@quilted/browserslist-config`](https://github.com/lemonmade/quilt/tree/main/packages/browserslist-config) package, which makes it easy to add additional builds while keeping some of Quilt’s defaults. For example, the following browserslist configuration, placed in your app’s `package.json`, would use the `modules` and `evergreen` targets described above, but would use a default build that includes support for IE 11:

```json
{
  "browserslist": {
    "my-defaults": ["defaults", "IE 11"],
    "modules": ["@quilted/browserslist-config/modules"],
    "evergreen": ["@quilted/browserslist-config/evergreen"]
  }
}
```

Each named configuration will be turned into a build, with the name being included in the resulting file for easy identification (e.g., `app.my-defaults.abc123.js`).

# Static builds

Quilt can create a static build of your application where, in addition to your [browser assets](./browser.md), Quilt will pre-generate HTML files for every route it finds in your application. This capability is optional and is disabled by default, as we feel Quilt’s [server-side rendering feature](./server.md) is a better fit for most applications. However, many deployment platforms have excellent support for static sites, so enabling static builds is as simple as setting `static: true` in your app’s `sewing-kit.config.ts` file:

```ts
// Your app’s sewing-kit config, usually sewing-kit.config.ts or app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      // In future examples, you will see that we change `true` to be
      // an object, which is how we provide more detailed configuration
      // for the static build.
      static: true,
    }),
  );
});
```

When you turn on static builds, your built assets will be nested a little deeper — under `./build/public/assets`, instead of the usual `./build/assets`. This allows us to render all the HTML documents for your static application into `./build/public`, without having any other build artifacts getting in the way. For most deployment platforms, you’ll only need to tell them your build command (typically, `yarn build`) and point them at `./build/public` as your output directory,

All of Quilt’s features are designed to work great with static rendering. You can use the [HTML components and hooks](../../../html.md) to customize the `<head>` and other details of the HTML document, the [HTTP utilities](../../../http.md) to establish [404 pages and set other headers](#deeper-customizations-with-sewing-kit), and much more. Under the hood, Quilt’s static rendering uses the same approach that powers Quilt’s server-side rendering, so all of the [server-related utilities](../../../server-rendering.md) also just work when rendering your app statically.

When setting `static: true`, Quilt’s [automatic server-rendering](./server.md) becomes disabled by default. If you want to have both the static build and the server-rendering builds at the same time, you’ll need to explicitly enable both.

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      server: true,
      static: true,
    }),
  );
});
```

## Route detection

As noted in the [routing guide](../../../routing.md), Quilt does not use file-system based routing. Instead, your routes are declared in components, using the [`useRoutes` hook](./TODO).

```tsx
// app/foundation/Routes/Routes.tsx

import {useRoutes, Link} from '@quilted/quilt';
import type {PropsWithChildren} from '@quilted/quilt';

export function Routes() {
  const routes = useRoutes([
    {match: '/', render: () => <Start />},
    {match: 'settings', render: () => <Settings />},
  ]);

  return <Frame>{routes}</Frame>;
}

function Frame({children}: PropsWithChildren) {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Start</Link>
          </li>
          <li>
            <Link to="/">Settings</Link>
          </li>
        </ul>
      </nav>
      {children}
    </div>
  );
}

function Start() {
  return <div>Start here!</div>;
}

function Settings() {
  return <div>Settings go here!</div>;
}
```

In the example above, three routes are declared:

- `/`, the explicitly declared route that renders `Start`.
- `/settings`, the explicitly declared route that renders `Settings`.
- `/*`, a fallback route that sets the status code to 404. This route is created implicitly by Quilt. You can disable it entirely by passing `{notFound: false}` as the third option of the `useRoutes` hook, or you can provide your own fallback by providing an explicit route without a `match` condition.

Quilt’s static rendering mode automatically detects these routes without any custom configuration on your part. It does this by compiling your application component (the one you export as the default export from your main `App.tsx` file) into a small Node script, and then rendering the root route of your application (`/`). In this first render, two things happen:

1. We get the static HTML output for the root route, which is output to `./build/public/index.html`.
1. We detect all the other routes of your application, which are added to a queue to render next.

Quilt continues to perform this “crawling” of your application until all routes have been detected and rendered, including routes that are declared across [async component boundaries](../../../async.md).

If you don’t want to render the `/` route in your application (typically because you know this route is not handled), or you would like to start Quilt’s static rendering queue with a larger list of routes, you can do so by passing `static.routes` in your app’s `sewing-kit.config.ts`:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: {
        routes: ['/admin', '/internal'],
      },
    }),
  );
});
```

This `routes` option can also be a function that returns a promise for the initial list of routes, which can be useful if you need to read the routes from somewhere in the filesystem, or by making a network request:

```ts
import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: {
        routes: async () => {
          // Reads the routes from a local routes.json file
          return JSON.parse(await app.fs.read('routes.json'));
        },
      },
    }),
  );
});
```

Even if you specify explicit routes, Quilt will still perform its crawling of your application to try and detect additional explicit and fallback routes you didn’t declare. If you want to disable this behavior so that only the routes you explicitly declare (or, only the `/` route, if you do not explicitly specify any routes), you can set `static.crawl` to `false`:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: {
        routes: ['/admin', '/internal'],
        crawl: false,
      },
    }),
  );
});
```

### Dynamic routes

With Quilt’s router, you can declare “dynamic routes”, where many different route patterns are able to match. For example, this route component declares a `products` route, and nested beneath it, a route with a regular expression match (`/\d+/`), which will match the “next” path part (after `products`) that contains only numbers. This example passes the matched part of the path (only the digits after `/products/`) so that it can be customized for just that particular product:

```tsx
// app/foundation/Routes/Routes.tsx

import {useRoutes} from '@quilted/quilt';

export function Routes() {
  const routes = useRoutes([
    {match: '/', render: () => <Start />},
    {
      match: 'products',
      children: [
        {match: /\d+/, render: ({matched}) => <Product id={matched} />},
      ],
    },
  ]);

  return routes;
}

function Start() {
  return <div>Probably render links to the products?</div>;
}

function Product({id}: {id: string}) {
  return <div>Product: {id}</div>;
}
```

In addition to the explicit `/` route, and the implicitly-created `/*` and `/products/*` fallback routes (TODO), it would be great if Quilt could statically render all the individual product routes. However, because the route is dynamic, Quilt needs some information from you to teach it what routes should be built. You can do this by adding a `renderStatic` function to the dynamic route, which should return an array of strings (or a promise for an array of strings) that will match this dynamic pattern:

```tsx
// app/foundation/Routes/Routes.tsx

import {useRoutes} from '@quilted/quilt';

export function Routes() {
  const routes = useRoutes([
    {match: '/', render: () => <Start />},
    {
      match: 'products',
      children: [
        {
          match: /\d+/,
          render: ({matched}) => <Product id={matched} />,
          renderStatic: () => ['123', '456', '789'],
        },
      ],
    },
  ]);

  return routes;
}

// snip!
```

With the updated example above, Quilt will detect that it needs to build `/products/123`, `/products/456`, and `/products/789`. In practice, you will probably either make a network request, or read from the file system, in order to populate the array of matches. Quilt automatically removes this method from the browser and server builds (TODO), and will only ever run the `renderStatic` function once per static build for a given route.

### Fallback routes

Quilt’s router supports “fallback” routes, which are matched when no other sibling matches, and by default uses fallbacks that set a 404 status code. While useful, these fallbacks are hard to express in a static build, where files on disk are meant to map directly to “real” routes in your application.

Quilt defaults to a pattern for these routes that works in several hosting providers: it only renders a fallback for the root route (`/`), and only if it has an explicit `404` status code (which you can do with the `NotFound` component or the `useStatusCode` hook, both from `@quilted/quilt/http`). With this specific combination, Quilt will write the resulting render to `./build/public/404.html`. Fallbacks for all other routes, and fallbacks without an explicit 404 status code, will not be rendered.

The behavior of what routes get rendered, and with what filenames, can be customized more deeply with a [Sewing Kit plugin](./TODO), which we will discuss next. Sewing Kit also gives you (or the Sewing Kit plugins you use) the ability to handle other details about your application that are represented differently in different static hosting platforms, like headers and redirects.

## Customizing the build outputs

By default, Quilt uses [Prettier](https://prettier.io) to format the HTML files it builds. You can disable this option by setting `static.prettify` to `false`, which will write the HTML files in a minified format:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: {
        prettify: false,
      },
    }),
  );
});
```

## Deeper customizations with Sewing Kit

Quilt exposes a collection of [Sewing Kit hooks](./TODO) for deeply customizing the Quilt app static build:

- `quiltStaticBuildRoutes`, which lets you customize the initial list of routes that Quilt will static render (defaults to `/`, or the value resolved from the `static.routes` option for this app if that option is set)
- `quiltStaticBuildCrawl`, which lets you customize whether Quilt will detect additional routes while rendering your application (defaults to `true`, or the `static.crawl` option for this app if that option is set)
- `quiltStaticBuildPrettify`, which lets you customize whether Quilt will pretty print the HTML outputs with Prettier (defaults to `true`, or the `static.prettify` option for this app if that option is set)
- `quiltStaticBuildWriteRoute`, which lets you customize the path of the file that gets created for a given route, or disable writing that file entirely.

The `quiltStaticBuildWriteRoute` hook is particularly useful. It is called with the current result from calling previous hooks, and some additional context on the rendered route, including what the application route was, whether this is a “fallback” route, and the HTTP details recorded while rendering the route. It is expected to return a string with the filename to use, or `false` to not write the file at all.

You can use this hook to change the default fallback writing behavior of Quilt. For example, the following custom plugin renders _all_ fallback routes with 404 status codes, nesting them as `404.html` files in their relative position in the router:

```ts
import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: true,
    }),
  );
  app.use(
    createProjectPlugin({
      name: 'MyApp.UpdateStaticBuild',
      build({configure}) {
        configure(({quiltStaticBuildWriteRoute}) => {
          quiltStaticBuildWriteRoute?.(
            (writeRoute, {route, fallback, http}) => {
              if (!fallback) return writeRoute;
              if (http.statusCode !== 404) return false;

              // The first character of the route is the `/`
              return `${route.slice(1)}/404.html`;
            },
          );
        });
      },
    }),
  );
});
```

Because it is called with the HTTP-related details for the render, this is also a great place to add support for those headers and redirects in the static build being produced. For example, the following Sewing Kit plugin reads any headers (other than `content-type`, which is always set to `text/html` and generally handled by hosting platforms automatically), stores them, and uses the results to build a `_headers` file that contains any custom headers:

```ts
import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: true,
    }),
  );
  app.use(
    createProjectPlugin({
      name: 'MyApp.WriteStaticHeaders',
      build({project, configure, run}) {
        const headersByFile = new Map<string, Map<string, string>>();

        configure(({quiltStaticBuildWriteRoute}) => {
          quiltStaticBuildWriteRoute?.(
            (writeRoute, {route, fallback, http}) => {
              if (writeRoute) {
                const headers = new Map(http.headers.entries());
                headers.delete('content-type');
                if (headers.size > 0) {
                  headersByFile.set(writeRoute, headers);
                }
              }

              return writeRoute;
            },
          );

          run((step) =>
            step({
              name: 'MyApp.WriteStaticHeaders',
              stage: 'post',
              async run() {
                if (headersByFile.size === 0) return;

                // Writing a file in the format Netlify expects:
                // https://docs.netlify.com/routing/headers/#syntax-for-the-headers-file
                await project.fs.write(
                  project.fs.buildPath('_headers'),
                  [...headersByFile]
                    .map(
                      ([file, headers]) =>
                        `/${file}\n${[...headers]
                          .map(([header, value]) => `  ${header}: ${value}`)
                          .join('\n')}`,
                    )
                    .join('\n'),
                );
              },
            }),
          );
        });
      },
    }),
  );
});
```

Sewing Kit plugins for hosting providers, like the [`cloudflarePages`](./TODO) or [`netlify`](./TODO) plugins, use the `quiltStaticBuildWriteRoute` hook to match the supported features of those platforms. You shouldn’t need to configure it manually unless you are trying to do something a little more custom.

When Quilt is building the static version of your app, it sets the `quiltAppStatic` option to `true`. You can use the presence of this option to perform tooling customizations that only apply to the static build:

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
        configure(({rollupPlugins}, {quiltAppStatic}) => {
          if (!quiltAppStatic) return;

          rollupPlugins?.(addMyStaticOnlyRollupPlugins);
        });
      },
    }),
  );
});
```

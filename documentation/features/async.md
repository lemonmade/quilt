# Asynchronous code

As your application gets more complicated, you will add more code that is not seen by every user, on every visit. As soon as you add a second [route](./routing.md) to your application, it’s very likely that at least some users would be better off if the application only loaded code for the pages they actually visit. Even a single, complicated page may have many sections that are not always rendered.

Many frameworks, like [Next.js](https://nextjs.org/docs/routing/introduction) and [Remix](https://remix.run/docs/en/v1/guides/routing), offer automatic route-based bundle splitting. This is a great feature, because route boundaries are the most reliable place to split up your application into smaller “chunks”, with each part being loaded only as needed. However, Quilt does not use [file-system based routing](./routing.md), and this approach does not help in cases where you have code on a single route that can be split up.

Quilt’s solution to this problem is to add a bit of sugar on top of JavaScript’s native [dynamic import (`import(...)`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import). As the developer, you are fully in control of what parts of your application are split up, and Quilt helps you load and preload the relevant client-side assets, whether you render on the server, client, or both.

## Asynchronous components

Quilt is a [component-first framework](TODO); components are used to declare all the UI in your application. To make sure you can use components for everything this without your app’s bundles growing indefinitely, Quilt provides a first-class way to make a component be asynchronously loaded — that is, components that only load the JavaScript and CSS assets they need when they are rendered to the page.

To create an asynchronous component, use the `createAsyncComponent()` helper provided by this library. This function takes a single argument: a function that asynchronously imports another module containing a React component as the default export:

```tsx
// AsyncComponent.tsx
import {createAsyncComponent} from '@quilted/quilt';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponentImplementation'),
);

// AsyncComponentImplementation.tsx
export default function AsyncComponent() {
  return <div>My async component!</div>;
}
```

This process is very similar to how React’s built-in [`lazy()` utility](https://reactjs.org/docs/code-splitting.html#reactlazy) works. Components created with Quilt’s `createAsyncComponent()` have a number of differences from React’s `lazy` components, though:

- When rendered during server rendering, Quilt loads the component and renders it as if it were synchronous, and records all the JavaScript and CSS assets to include in the initial HTML response
- When loaded on the client, Quilt can synchronously render an asynchronous component, if it was rendered during server rendering or has been rendered on the client before
- Quilt’s asynchronous components have additional features, like preloading and fine-grained asset controls, which are described below

Unlike `lazy()`, `createAsyncComponent()` does not use Suspense. Instead, you can use the `renderLoading()` and `renderError()` options when creating the component to control how it should render in cases where the component’s assets have not loaded successfully:

```tsx
import {createAsyncComponent} from '@quilted/quilt';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponentImplementation'),
  {
    renderLoading() {
      return <SkeletonAsyncComponent />;
    },
    renderError(error) {
      return <div>Something went wrong: {error.message}</div>;
    },
  },
);
```

### Preloading component assets

Sometimes, you don’t need to render a component yet, but you might need to in the future. This is common on “list” pages for a resource, where you can reasonably expect that a user will navigate to the “detail” page for an individual resource. Quilt provides a `usePreload()` hook that can use to mark assets for an asynchronous component as needing preloading:

```tsx
import {createAsyncComponent, usePreload} from '@quilted/quilt';

const Detail = createAsyncComponent(() => import('./Detail'));

export function List() {
  const preload = usePreload(Detail);

  useEffect(() => {
    preload();
  }, [preload]);

  return <ul>{/* List that might later display a `Detail` component... */}</ul>;
}
```

Async components also have a convenience `Preload` component available to use, which lets you conditionally preload the component using JSX, without manually calling the `preload` function yourself:

```tsx
import {createAsyncComponent, usePreload} from '@quilted/quilt';

const Detail = createAsyncComponent(() => import('./Detail'));

export function List() {
  return (
    <>
      <ul>{/* List that might later display a `Detail` component... */}</ul>
      <Detail.Preload />
    </>
  );
}
```

To preload a resource, Quilt will include a [`<link rel="preload">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload) tag (or [`<link rel="modulepreload">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/modulepreload), for module scripts) for the entire dependency graph of that asynchronous component. This same mechanism works both for server rendering and client-side rendering.

#### Preloading routes

As noted earlier, splitting your app based on the routes in your application is a great place to start, since users only see content for one route at a time. A very common case for asynchronous components is to use them as the [content for a route](./routing.md):

```tsx
import {createAsyncComponent, useRoutes} from '@quilted/quilt';

const Home = createAsyncComponent(() => import('./Home'));
const Account = createAsyncComponent(() => import('./Account'));
const NotFound = createAsyncComponent(() => import('./NotFound'));

export function Routes() {
  return useRoutes(
    [
      {path: '/', render: () => <Home />},
      {path: '/account', render: () => <Account />},
    ],
    {notFound: () => <NotFound />},
  );
}
```

If we use asynchronous components in this way, we will indeed prevent the user from loading code for routes they do not visit. However, this might make their experience quite a bit worse in some cases, because the JavaScript and CSS the component needs is only fetched when the component is rendered — that is, when the user navigates to the route. While the assets are loading, the user is stuck waiting. If your component needs to fetch additional data to render anything useful, the user will be waiting even longer.

In addition to manually preloading assets as shown above, each route you define can have an additional `renderPreload` key. This function will be run, and the resulting React element rendered, whenever a user signals intention to navigate to this route. We can use the `Preload` component discussed above to add route-based preloading to our example:

```tsx
import {createAsyncComponent, useRoutes} from '@quilted/quilt';

const Home = createAsyncComponent(() => import('./Home'));
const Account = createAsyncComponent(() => import('./Account'));
const NotFound = createAsyncComponent(() => import('./NotFound'));

export function Routes() {
  return useRoutes(
    [
      {
        path: '/',
        render: () => <Home />,
        renderPreload: () => <Home.Preload />,
      },
      {
        path: '/account',
        render: () => <Account />,
        renderPreload: () => <Account.Preload />,
      },
    ],
    {notFound: () => <NotFound />},
  );
}
```

#### Customizing preloading

By default, preloading an asynchronous component simply loads that component’s assets. However, complex components might want to preload other assets that could be used by the component, or to start fetching data ahead of the component’s assets being ready. You can accomplish this by passing a custom `usePreload` option to `createAsyncComponent()`:

```tsx
import {createAsyncComponent, usePreload} from '@quilted/quilt';

import {DeeplyNestedAsyncComponent} from './DeeplyNestedAsyncComponent';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponent'),
  {
    usePreload() {
      // AsyncComponent might use DeeplyNestedAsyncComponent, so preload its assets too
      usePreload(DeeplyNestedAsyncComponent);
    },
  },
);
```

This option will be called as a React hook, so it must follow the [rules of hooks](https://reactjs.org/docs/hooks-rules.html). As shown above, a common pattern is to call the `usePreload()` hook on other, preloadable objects, but this is not the only option! You can also do things like add your own [`<link rel="preload">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload) tags, or start manually fetching data that you keep in some sort of global JavaScript object.

```tsx
import {createAsyncComponent} from '@quilted/quilt';
import {useLink} from '@quilted/quilt/html';

import {DeeplyNestedAsyncComponent} from './DeeplyNestedAsyncComponent';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponent'),
  {
    usePreload() {
      // Add a preload tag for a JSON file that our component will request
      useLink({
        rel: 'preload',
        href: '/api/data.json',
        as: 'fetch',
      });
    },
  },
);
```

Sometimes, the preloading work you need to do depends on some properties that are passed to the component. In this case, you can define a custom set of “preload options” that must be passed to this component, and use those options to customize your `usePreload()` logic:

```tsx
import {createAsyncComponent} from '@quilted/quilt';
import {useLink} from '@quilted/quilt/html';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponentImplementation'),
  {
    usePreload({id}: {id: string}) {
      // Add a preload tag for a JSON file that our component will request,
      // which is dependent on the `id` prop passed when preloading
      useLink({
        rel: 'preload',
        href: `/api/products/${id}.json`,
        as: 'fetch',
      });
    },
  },
);
```

Now, when preloading the component, you will be forced to pass the `id` option:

```tsx
import {usePreload} from '@quilted/quilt';
import {AsyncComponent} from './AsyncComponent';

function UsesAsyncComponent() {
  usePreload(AsyncComponent, {id: '123'});

  // or

  return <AsyncComponent.Preload id="123" />;
}
```

### Controlling render timing

By default, asynchronous components will render during server-side rendering. You can disable this behavior by passing `render: 'client'` when creating the component with `createAsyncComponent()`:

```tsx
import {createAsyncComponent} from '@quilted/quilt';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponent'),
  {render: 'client'},
);
```

When a component like this is rendered on the server, it will render whatever you return from the `renderLoading()` option, or `null` if you do not provide that option.

You may want to use this technique for components that rely on libraries that only work on the client, such as the [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API). If you do restrict your component to client-side rendering, Quilt defaults to enabling the `preload` option for the asynchronous component, which will cause the component’s assets to be preloaded by the browser. You can disable this behavior by setting `preload: false`, but only do this if there is a strong technical reason why the assets can’t be preloaded.

### Controlling hydration timing

When an asynchronous component is rendered on the server, Quilt will include its assets in the initial HTML payload. Quilt makes sure these assets are available _before_ your main app bundle so that the component can be hydrated synchronously, without waiting for its assets to load. However, Quilt also supports alternative strategies that allow you to delay when the component’s assets are actually loaded by the browser. This technique could be described as “deferred hydration”, and it is useful for components that you want to render on the server, but which are less important to make interactive than other content on the page.

To enable this “deferred hydration” behavior, pass `hydrate: 'deferred'` (or `hydrate: false`) when creating an asynchronous component with `createAsyncComponent()`:

```tsx
import {createAsyncComponent} from '@quilted/quilt';

export const AsyncComponent = createAsyncComponent(
  () => import('./AsyncComponent'),
  {hydrate: 'defer'},
);
```

This component will be rendered during server rendering, but **you** are in charge of when its actual assets are loaded. You can do this by calling the asynchronous component’s `load()` method whenever you feel is the right time to load the component’s assets:

```tsx
import {useEffect} from 'react';
import {createAsyncComponent} from '@quilted/quilt';

const AsyncComponent = createAsyncComponent(() => import('./AsyncComponent'), {
  hydrate: 'defer',
});

export function Home() {
  // Load the component’s assets in an effect, so they are deferred until after
  // the rest of our component has rendered.
  useEffect(() => {
    AsyncComponent.load();
  }, []);

  return <AsyncComponent />;
}
```

You can call this `load()` method whenever you like, including in response to events or information read from the browser. A common pattern is to load the component’s assets when the browser has some idle time, which you can do easily using Quilt’s `useIdleCallback()` hook:

```tsx
import {createAsyncComponent, useIdleCallback} from '@quilted/quilt';

const AsyncComponent = createAsyncComponent(() => import('./AsyncComponent'), {
  hydrate: 'defer',
});

export function Home() {
  useIdleCallback(() => {
    AsyncComponent.load();
  });

  return <AsyncComponent />;
}
```

Keep in mind that this deferred hydration only applies to components rendered during server rendering. Asynchronous components encountered during client-side rendering (for example, in response to a route change) will be hydrated immediately, regardless of the `hydrate` option.

## Asynchronous modules

Asynchronous components are actually just a think wrapper around a more general concept of “asynchronous modules”. You can use asynchronous modules to split out non-component parts of your codebase that may not be needed for every page load, such as complex mutation handling or libraries you use in response to user events. Asynchronous modules also have the same server-rendering and preloading capabilities documented above for asynchronous components.

To create an asynchronous module, use the `createAsyncModule()` function to wrap a dynamic import for the module you want to split out of your main bundles:

```tsx
import {createAsyncModule} from '@quilted/quilt';

const asyncDependency = createAsyncModule(
  () => import('my-expensive-dependency'),
);
```

The asynchronous module comes with a `load()` method that you can call to gain access to the wrapped module. It also has a `loaded` field that provides the module synchronously, if you have already loaded it before.

```tsx
import {createAsyncModule} from '@quilted/quilt';

const asyncDependency = createAsyncModule(
  () => import('my-expensive-dependency'),
);

function Start() {
  return (
    <button
      onClick={async () => {
        // The type of `load()` is a promise that resoles with the module, so
        // you should see all the types you declared in that module reflected here.
        const {dependencyMethod} =
          asyncDependency.loaded ?? (await asyncDependency.load());

        dependencyMethod();
      }}
    >
      Use your expensive library!
    </button>
  );
}
```

Using an asynchronous module this way is no different than using `import()` directly, other than the `loaded` field giving cached access to previously-loaded modules. However, the wrapping object offers a few performance-minded features that can’t be achieved with `import()` alone.

If you aren’t using the library just yet, but know you will likely use it when the app has loaded, you can preload its assets using the `useAsyncModulePreload()` hook:

```tsx
import {createAsyncModule, useAsyncModulePreload} from '@quilted/quilt';

const asyncDependency = createAsyncModule(
  () => import('my-expensive-dependency'),
);

function Start() {
  useAsyncModulePreload(asyncDependency);

  return (
    <button
      onClick={async () => {
        // The type of `load()` is a promise that resoles with the module, so
        // you should see all the types you declared in that module reflected here.
        const {dependencyMethod} =
          asyncDependency.loaded ?? (await asyncDependency.load());

        dependencyMethod();
      }}
    >
      Use your expensive library!
    </button>
  );
}
```

If you need the asynchronous module to render your component, you can use the `useAsyncModule()` hook to load the module and keep track of its loading state. When called during server-side rendering, this hook will ensure the module’s assets are included in the HTML payload so that they are available synchronously when rendering on the client.

```tsx
import {createAsyncModule, useAsyncModule} from '@quilted/quilt';

const asyncDependency = createAsyncModule(
  () => import('my-expensive-dependency'),
);

function Start() {
  const {
    resolved: dependency,
    loading,
    error,
  } = useAsyncModule(asyncDependency);

  if (error) return <p>Something went wrong!</p>;
  if (loading) return <p>Loading...</p>;

  return <div>{dependency.getContent()}</div>;
}
```

## Asynchronous loading in packages and services

When writing libraries and packages, we recommend that you stick to using JavaScript’s standard dynamic `import()` statements to load code asynchronously. This technique can be just as important in backend applications and packages as it is in the front-end, as it allows you to defer loading code that the user (be they human or machine) may not need.

Quilt’s `build` command automatically splits code outputs for both [packages](../projects/packages/builds.md) and [services](../projects/services/builds.md), so you can use `import()` without worrying too much about the details. If you need to be able to cache asynchronously loaded modules, you can use the [`createAsyncModule()` function documented above](#asynchronous-modules).

# Asynchronous code

Quilt provides a set of utilities that let you control how to load the minimal amount of JavaScript in a performance-sensitive way. These utilities build on powerful JavaScript primitives, like [the dynamic `import()` expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and [`<link rel="modulepreload">](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/modulepreload), while giving you fine-grained control over what JavaScript is loaded.

## Asynchronous modules

If you’re using Quilt to write a backend server, a package, or a simple application, you may not need any of the utilities described below. When you have a large chunk of code that you only conditionally need to load, or that you can delay the loading of until a later time, a standard dynamic `import()` expression may be all you need:

```ts
// In this example, we’ve got some analytics code that can run asynchronously.
// Unless this is part of a web application where the code must be more eagerly
// loaded, we can use a standard dynamic `import()`.
export async function loadAnalyticsLazily() {
  const [analytics1, analytics2] = await Promise.all([
    import('./large-analytics-file-1.ts'),
    import('./large-analytics-file-2.ts'),
  ]);

  await Promise.all([analytics1.track(), analytics2.track()]);
}
```

Quilt provides plugins for [Rollup](/packages/rollup/) and [Vite](/packages/vite/), and both tools will default to treating dynamic imports as bundle “split points” in any assets built from the project.

Dynamic imports are handy, but in the context of a server-rendered web application, they can be a little dangerous. You’ll often use dynamic imports on the client, but without taking care, you may create expensive network waterfalls by doing so, since code only starts loading after earlier code that depends on it has downloaded and executed. On slow network connections, these waterfalls can severely degrade the user experience.

Quilt provides a helpful extension to the basic dynamic import to help you improve the performance of splitting a web application up: `AsyncModule`.

```tsx
// app.ts

import {AsyncModule} from '@quilted/quilt/async';

const myModule = new AsyncModule(() => import('./my-expensive-module.ts'));

// my-expensive-module.ts

import expensiveDependency from 'expensive-dependency';

export function getContent() {
  return expensiveDependency.getContent();
}
```

The `AsyncModule` class wraps around a dynamic import, and integrates with Quilt’s [server-rendering utilities](/documentation/features/server-rendering.md) to allow async modules to be included in server-rendered HTML content, either as full-blown script tags or using [`<link rel="modulepreload">](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/modulepreload). This class also caches the loaded module, and gives you a collection of [signals](https://preactjs.com/guide/v10/signals/) for inspecting the loading state of the module.

If a module has already been loaded, it will be available through the `module` property of the `AsyncModule` class. If it hasn’t been loaded, you can run the dynamic import callback you passed in the constructor by calling the `load()` method:

```tsx
import {AsyncModule} from '@quilted/quilt/async';

const myModule = new AsyncModule(() => import('./my-expensive-module.ts'));

// `module` can be `undefined`, if the module has not loaded yet
const resolvedModule = myModule.module ?? (await myModule.load());
```

The `AsyncModule` class can be useful in any JavaScript context, but Quilt offers some extra goodies for using these instances in a Preact application. Quilt provides a `useAsyncModule()` hook that will [suspend](https://preactjs.com/guide/v10/switching-to-preact/#suspense-experimental) while the module is loading, allowing you to seamlessly incorporate the the loading of these async modules into your React components.

When you use Quilt’s [Rollup and Vite plugins for building your server](/documentation/projects/apps/server.md), Quilt will automatically include any JavaScript and CSS assets for modules you pass to `useAsyncModule()` in the HTML response, so that they are loaded early by the browser, and not just when the client detects that the module is needed.

```tsx
import {AsyncModule, useAsyncModule} from '@quilted/quilt/async';

const myModule = new AsyncModule(() => import('./my-expensive-module.ts'));

export function App() {
  const {getContent} = useAsyncModule(myModule).module;
  return <>Content: {getContent()}</>;
}
```

### Deferring asynchronous modules

`useAsyncModule()` also accepts a `defer` option. When set to `true`, the hook will _not_ suspend, and you can instead use the module’s `load()` method to manually load it later on. The async module’s `module`, `status`, and `isLoading` properties can be used to inspect the module’s state as it is loaded. These properties are all backed by signals, so any component that reads them will automatically re-render when the module’s loading state changes.

```tsx
import {AsyncModule, useAsyncModule} from '@quilted/quilt/async';

const myModule = new AsyncModule(() => import('./my-expensive-module.ts'));

export function App() {
  const {isLoading, status, load} = useAsyncModule(myModule, {defer: true});

  return (
    <>
      <div>Status: {status}</div>
      <button onClick={() => load()} disabled={isLoading}>
        Load module
      </button>
    </>
  );
}
```

If you have an async module you know you are likely to use in the future, you can add basic preloading for that module’s assets using the `useAsyncModulePreload()` hook. During server-side rendering, this hook will add `<link>` tags to preload the assets. During client-side rendering, this hook will load the module in an effect.

```tsx
import {AsyncModule, useAsyncModulePreload} from '@quilted/quilt/async';

export const myModule = new AsyncModule(
  () => import('./my-expensive-module.ts'),
);

export function App() {
  useAsyncModulePreload(myModule);

  return <RestOfApp />;
}
```

## Asynchronous components

We haven’t talked much about what kind of code you load dynamically with an `AsyncModule`, and by default, you can include any code that your bundler knows how to convert into a JavaScript module. You might put an expensive NPM dependency in this module, or analytics code that you can safely defer until later.

Another common use of these “asynchronous modules” is code that you only need to use conditionally. Perhaps you have a large feature that not all users of your application have access to, or you are experimenting with multiple variations of a particular page.

In a Preact application, we often represent these kind of conditionally-rendered bits of UI as components — when a bit of data is true, we show a component, and when it is false, we don’t.

```tsx
function OrderDetails() {
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? <Returns /> : <>There’s nothing for you to do.</>;
}

function Returns() {
  // ...
}
```

In the example above, the `Returns` component will be loaded on the page, even if it’s never used. This might not be a problem when the conditionally-rendered components are small, but as an app grows, many parts often become unnecessary for any given user. In these cases, you could save a lot of bandwidth — and initial execution time — if you split the conditionally-rendered code into a dedicated bundle, and loaded it only when needed.

Quilt offers a powerful way to dynamically load parts of your Preact application, and it does so using a concept we call “asynchronous components”. Asynchronous components are just asynchronous modules that have a default export of a React component, which Quilt then lets you render using the `AsyncComponent` component:

```tsx
import {AsyncModule, AsyncComponent} from '@quilted/quilt/async';

const returnsModule = new AsyncModule(() => import('./Returns.tsx'));

function OrderDetails() {
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? (
    <AsyncComponent module={returnsModule} />
  ) : (
    <>There’s nothing for you to do.</>
  );
}

// Returns.tsx

export default function Returns() {
  // ...
}
```

When the application is server-rendered, the JavaScript and CSS needed for the component will be included in the initial HTML document. When the component renders on the client, its code will be fetched when the component is rendered (but, if the component was server-rendered, its code may have already loaded by the time it is needed). In all cases, users without the returns feature never get the code for it.

Like `useAsyncModule()`, `AsyncComponent` uses suspense to indicate when the module has not yet been loaded. You can include a `Suspense` component to provide a loading state while the component is being fetched:

```tsx
import {Suspense} from 'react';
import {AsyncModule, AsyncComponent} from '@quilted/quilt/async';

const returnsModule = new AsyncModule(() => import('./Returns.tsx'));

function OrderDetails() {
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? (
    <Suspense fallback={<LoadingUI />}>
      <AsyncComponent module={returnsModule} />
    </Suspense>
  ) : (
    <>There’s nothing for you to do.</>
  );
}

function LoadingUI() {
  // ...
}
```

Using suspense in this way has an extra benefit for server-rendered code: Preact will preserve server-rendered markup while async components are being loaded, allowing each async component to hydrate independently. This pattern is sometimes referred to as “partial hydration” or “islands of interactivity”, and it can help make your server-rendered application responsive to user input more quickly.

Because providing a loading UI is so common, `AsyncComponent` accepts a `renderLoading` property that will render the `Suspense` component for you:

```tsx
import {AsyncModule, AsyncComponent} from '@quilted/quilt/async';

const returnsModule = new AsyncModule(() => import('./Returns.tsx'));

function OrderDetails() {
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? (
    <AsyncComponent module={returnsModule} renderLoading={<LoadingUI />} />
  ) : (
    <>There’s nothing for you to do.</>
  );
}
```

If your asynchronous component has properties, you can pass them through using `AsyncComponent.props`:

```tsx
import {AsyncModule, AsyncComponent} from '@quilted/quilt/async';

const returnsModule = new AsyncModule(() => import('./Returns.tsx'));

function OrderDetails() {
  const data = useData();
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? (
    <AsyncComponent
      module={returnsModule}
      renderLoading={<LoadingUI />}
      props={{returns: data.returns}}
    />
  ) : (
    <>There’s nothing for you to do.</>
  );
}

// Returns.tsx

export default function Returns({returns}) {
  // ...
}
```

The `AsyncComponent` component can be a little tricky to wrap your head around, especially when you use many of its properties, or when the component it wraps itself has many properties. Quilt provides the `AsyncComponent.from()` helper to you create a simple wrapper component around an asynchronous module that you can use identically to the “real” component. `AsyncComponent.from()` lets you define the loading state and other properties of `AsyncComponent` in the second argument to the function, so you can provide a consistent set of properties even if the asynchronous component is rendered in multiple spots. For added convenience, `AsyncComponent.from()` accepts a dynamic import function directly, so you don’t need to construct an `AsyncModule` instance.

```tsx
import {AsyncComponent} from '@quilted/quilt/async';

const Returns = AsyncComponent.from(() => import('./Returns.tsx'), {
  renderLoading: <LoadingUI />,
});

function OrderDetails() {
  const data = useData();
  const hasReturnsFeature = useFeatureIsEnabled('returns');

  return hasReturnsFeature ? (
    <Returns data={data.returns} />
  ) : (
    <>There’s nothing for you to do.</>
  );
}
```

This `AsyncComponent.from()` format is preferred, and is used in all the [Quilt application templates](/documentation/getting-started.md#app-templates).

### Deferring asynchronous components

Like asynchronous modules, asynchronous components let you take more fine-grained control of when assets are loaded. One particularly useful trick is to defer the loading of a component’s JavaScript until you’re sure all the higher-priority work has finished. You may do this with a component that will render low on the page, or for a part of the page with infrequently-used functionality.

To accomplish this, Quilt let’s you specify how the client will render, both on the client and server. If we want to delay when the code for a component is loaded on the client, we can pass the `client: 'defer'` option to our asynchronous component. This will tell the async component to suspend, but not to load the JavaScript for the component immediately. Instead, you are in control of when the JavaScript loads, by calling the asynchronous component’s `load()` method. In the example below, we show delay loading the component until the browser is idle.

```tsx
import {useEffect} from 'react';
import {AsyncComponent} from '@quilted/quilt/async';

const BelowTheFoldComponent = AsyncComponent.from(
  () => import('./BelowTheFoldComponent.tsx'),
  {
    renderLoading: <LoadingUI />,
    client: 'defer',
  },
);

function App() {
  useEffect(() => {
    window.requestIdleCallback(() => {
      BelowTheFoldComponent.load();
    });
  }, []);

  return <BelowTheFoldComponent />;
}
```

During server rendering, these “deferred” components will still be rendered to HTML, and any CSS for the module will be included in the initial HTML, so that the component can render correctly. Quilt will also default to including `<link>` tags to preload the JavaScript for the module, but this behavior can be disabled by passing the `preload: false` option to `AsyncComponent`.

If you know want to preload assets for an asynchronous component that has not rendered yet, `AsyncComponent`s also come with a `Preload` component, which is just a convenient wrapper over the `useAsyncModulePreload()` hook described earlier.

```tsx
import {AsyncComponent} from '@quilted/quilt/async';

const DetailPage = AsyncComponent.from(() => import('./Detail.tsx'));

export function ListPage() {
  return (
    <>
      <ul>{/* List that might later display a `Detail` component... */}</ul>
      <DetailPage.Preload />
    </>
  );
}
```

### Routing with asynchronous components

Many frameworks, like [Next.js](https://nextjs.org/docs/routing/introduction) and [Remix](https://remix.run/docs/en/v1/guides/routing), offer automatic route-based bundle splitting. This is a great feature, because route boundaries are the most reliable place to split up your application into smaller “chunks”, with each part being loaded only as needed. However, Quilt does not use [file-system based routing](./routing.md), and this approach does not help in cases where you have code on a _single_ route that can be split up.

Quilt [provides a routing library](/documentation/features/routing.md), but it does not provide file-system routing. Instead, you have to manually create the page-based “split points” by wrapping the components for a route in async components. This requires more manual work on your part, but gives you more control over when assets load. It also lets you split complex pages up into smaller, conditionally-loaded “features”, which can be useful for highly dynamic applications.

```tsx
import {useRoutes} from '@quilted/quilt/navigation';
import {AsyncComponent} from '@quilted/quilt/async';

const ListPage = AsyncComponent.from(() => import('./List.tsx'));
const DetailPage = AsyncComponent.from(() => import('./Detail.tsx'));

export function App() {
  return useRoutes([
    {match: '/', render: <ListPage />},
    {match: /\w+/, render: ({matched}) => <DetailPage id={matched} />},
  ]);
}
```

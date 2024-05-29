# Asynchronous code

Most web applications rely heavily on asynchronous code. The most common example is typically data fetching: almost every application will need to load the data needed to render its user interface, and that data is rarely available synchronously. Quilt provides basic utilities for fetching this data asynchronously, giving you deep visibility into the state of your requests and allowing you to cache and refresh data as needed.

On top of these utilities for making fetching data, Quilt also provides a set of utilities that let you control how to load the minimal amount of JavaScript in a performance-sensitive way. These utilities build on powerful JavaScript primitives, like [the dynamic `import()` expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and [`<link rel="modulepreload">](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/modulepreload), while giving you fine-grained control over what JavaScript is loaded.

## Data fetching

On the web, we commonly use the [`fetch()` API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to load data from a server, and to perform mutations on that data in response to user actions. `fetch()` is a simple and easy-to-use API for accessing asynchronous data, but when building UIs, we often need additional features this API does not natively provide:

- We usually want to synchronously access the data we’ve fetched in the past, without issuing another request.
- We sometimes have multiple parts of the UI that need the same data, and we want to avoid fetching it multiple times.
- We need to manually manage state for details about the network request, like the loading state, errors, and the data itself.
- We sometimes need to incorporate data other than what we fetch from the server, like local data from various browser APIs.

Quilt offers a wrapper around `fetch()` — or any other asynchronous JavaScript function — that gives you access to these additional features: the `AsyncAction` class.

```ts
import {AsyncAction} from '@quilted/quilt/async';

const fetchUser = new AsyncAction(async (id: string) => {
  const response = await fetch(`/users/${id}`);
  const user = await response.json();
  return user;
});

const user = await fetchUser.run('123');
```

In the example above, we wrap our asynchronous data fetching function in an `AsyncAction`, and call `run()` to execute the function. This example is no better than just calling the asynchronous function directly, though. The real power comes in with the additional properties `AsyncAction` exposes.

For example, we can access the previously fetched data using the `value` and `error` properties. `value` gives us access to the last resolved value from the function (even if it wasn’t the last call to the function), and `error` gives us the error from the last call, if it was rejected.

```ts
import {AsyncAction} from '@quilted/quilt/async';

const fetchUser = new AsyncAction(async (id: string) => {
  /* see above */
});

await fetchUser.run('123');

// somewhere else in your code...

switch (fetchUser.status) {
  case 'resolved':
    console.log('Action previously resolved with value:', fetchUser.value);
    break;
  case 'rejected':
    console.log('Last call rejected with error:', fetchUser.error);
    break;
  default:
    console.log('Has not resolved or rejected yet');
}
```

You can call an `AsyncAction` using its `run()` method as many times as you like. The `value` and `error` properties will always reflect the results of the most recent call that was completed. If you want more details about individual calls to the function, `AsyncAction` also provides additional properties for inspecting the last finished call (`AsyncAction.finished`), the currently-running call (`AsyncAction.running`), and the most recent successful call (`AsyncAction.resolved`).

```ts
import {AsyncAction} from '@quilted/quilt/async';

const fetchUser = new AsyncAction(async (id: string) => {
  /* see above */
});

await fetchUser.run('123');
const promise = fetchUser.run('456');

console.log(fetchUser.finished.status); // 'resolved'
console.log(fetchUser.finished.value); // user for ID '123'
console.log(fetchUser.finished.input); // '123'

console.log(fetchUser.running.status); // 'pending'
console.log(fetchUser.running.input); // '456'
console.log(fetchUser.finished.value); // undefined, since the call is pending
```

Only one call to each `AsyncAction` can be running at a time. As additional calls are made, earlier pending calls are cancelled, and will not be moved to the `finished` property even if the call completes. You can handle this cancellation in your asynchronous function using the `AbortSignal` `signal` option passed in automatically by `AsyncAction`:

```ts
import {AsyncAction} from '@quilted/quilt/async';

const fetchUser = new AsyncAction(async (id: string, {signal}) => {
  // Pass `signal` through to `fetch()`, so we will cancel the request
  // if this call is aborted.
  const response = await fetch(`/users/${id}`, {signal});
  const user = await response.json();
  return user;
});
```

You can also manually cancel an in-flight action yourself. This can be done either by passing a `signal` into the `run()` method, or by calling the `abort()` method on an individual call:

```ts
import {AsyncAction} from '@quilted/quilt/async';

const fetchUser = new AsyncAction(async (id: string) => {
  /* see above */
});

// Manually `abort`ing the call

const promise = fetchUser.run('123');
const running = fetchUser.running; // also available as `promise.source`

running.abort();

// Or, passing a signal in

const controller = new AbortController();
const promise = fetchUser.run('456', {signal: controller.signal});

controller.abort();
```

### Data fetching in Preact

The `AsyncAction` class has one special feature we haven’t mentioned yet: all of its properties are backed by [signals](https://preactjs.com/guide/v10/signals/). That means that any Preact component can create an `AsyncAction`, and then use the properties of the action to automatically re-render when the state of the action changes.

In the example below, we create an `AsyncAction`, and force it to run when the component mounts. We use the `value` and `error` properties, documented above, to read and subscribe to the state of this action that we care about.

```tsx
import {useMemo, useEffect} from 'preact/hooks';
import {AsyncAction} from '@quilted/quilt/async';

export function App() {
  const fetchUser = useMemo(
    () =>
      new AsyncAction(async (id: string) => {
        const response = await fetch(`/users/${id}`);
        const user = await response.json();
        return user;
      }),
    [],
  );

  useEffect(() => {
    fetchUser.run('1');
    return () => fetchUser.abort();
  });

  if (fetchUser.value) {
    return <div>User: {fetchUser.value.name}</div>;
  }

  if (fetchUser.error) {
    return <div>Error: {fetchUser.error.message}</div>;
  }

  return <div>Loading...</div>;
}
```

This is handy, but you often want to cache asynchronous calls, so that multiple components — or the same component, rendering multiple times — can reuse previous results. Quilt provides an `AsyncActionCache` class that adds this capability to `AsyncAction`.

A simple application might create an `AsyncActionCache` instance for the entire app, and use its `create()` method directly to create and cache an `AsyncAction` for future use. You’ll need to provide a key for the cache, and a function that will create the `AsyncAction` when it is not already in the cache.

```tsx
import {useMemo, useEffect} from 'preact/hooks';
import {AsyncAction, AsyncActionCache} from '@quilted/quilt/async';

// If using server-rendering, you’ll want to create a new cache for each request
// that can be passed to the Preact app. We’ll show an example of how to do this
// in the next example.
const cache = new AsyncActionCache();

export function App() {
  const fetchUser = useMemo(() => {
    const action = cache.create(
      () =>
        new AsyncAction(async (id: string) => {
          const response = await fetch(`/users/${id}`);
          const user = await response.json();
          return user;
        }),
      {key: 'user'},
    );
  }, []);

  useEffect(() => {
    fetchUser.run('1');
    return () => fetchUser.abort();
  });

  if (fetchUser.value) {
    return <div>User: {fetchUser.value.name}</div>;
  }

  if (fetchUser.error) {
    return <div>Error: {fetchUser.error.message}</div>;
  }

  return <div>Loading...</div>;
}
```

Using an `AsyncAction` directly can be handy, but it can also feel a little overwhelming — there’s a lot for you to remember to do on your own. You need to grab an `AsyncActionCache`, if you’ve got one, create the `AsyncAction`, and run the action at the appropriate time (including when any input to the function changes). If you want the data to be fetched during server rendering, you’d need to build on the above examples by suspending while the initial data is being fetched, and communicating the cache of results from the server to the client.

To make this process easier, Quilt provides a handy `useAsync()` hook. This hook takes an async function to run and some details about how to cache the result. It will create and return an `AsyncAction` for you to use, as shown above, but provides smart default behavior. It will suspend if the `AsyncAction` has not yet run, and use a cache provided to Quilt’s `AsyncContext` component. The `AsyncContext` component will take care of serializing the cache from the server to the client, so that client-side rendering can pick up right where the server left off.

```tsx
import {Suspense} from 'preact/compat';
import {useAsync, AsyncContext, AsyncActionCache} from '@quilted/quilt/async';

// We’ll need to pass a `cache` prop to our app in both our browser and server
// entrypoints. In a Quilt app, these are typically the `browser.tsx` and `server.tsx`
// files, respectively.
export function App({cache}: {cache: AsyncActionCache}) {
  return (
    <AsyncContext cache={cache}>
      <Suspense fallback={null}>
        <UserDetails />
      </Suspense>
    </AsyncContext>
  );
}

function UserDetails() {
  const fetchUser = useAsync(
    async (id: string) => {
      const response = await fetch(`/users/${id}`);
      const user = await response.json();
      return user;
    },
    {
      key: 'user',
      input: '1',
    },
  );

  // We don’t need to manually run the action — that’s all handled by the hook!
  // Because the hook defaults to suspending when there have been no results, we
  // can also remove any handling of the `pending` state.

  if (fetchUser.value) {
    return <div>User: {fetchUser.value.name}</div>;
  }

  return <div>Error: {fetchUser.error.message}</div>;
}
```

In the example above, we have a constant input to the function — our `'1'` string, which gets passed to our async function. We can cause this action to re-run by changing the `input` option to the `useAsync` hook, or by providing a signal as the `input` option instead:

```tsx
import {Suspense} from 'preact/compat';
import {useSignal} from '@quilted/quilt/signals';
import {useAsync, AsyncContext, AsyncActionCache} from '@quilted/quilt/async';

// We’ll need to pass a `cache` prop to our app in both our browser and server
// entrypoints. In a Quilt app, these are typically the `browser.tsx` and `server.tsx`
// files, respectively.
export function App({cache}: {cache: AsyncActionCache}) {
  const user = useSignal('1');

  return (
    <AsyncContext cache={cache}>
      <Suspense fallback={null}>
        <UserDetails
          user={user}
          onNextUser={() => {
            const current = Number.parseInt(user.value, 10);
            user.set(String(current + 1));
          }}
        />
      </Suspense>
    </AsyncContext>
  );
}

function UserDetails({user, onNextUser}) {
  const fetchUser = useAsync(
    async (id: string) => {
      const response = await fetch(`/users/${id}`);
      const user = await response.json();
      return user;
    },
    {
      key: 'user',
      // When this signal changes, the action will re-run
      input: user,
    },
  );

  if (fetchUser.value) {
    return (
      <div>
        User: {fetchUser.value.name}{' '}
        <button onClick={onNextUser}>Next user</button>
        {/* we can use the `running` field to get access to each new call to the async function */}
        {fetchUser.running ? (
          <div>Fetching user with input: {fetchUser.running.input}</div>
        ) : null}
      </div>
    );
  }

  return <div>Error: {fetchUser.error.message}</div>;
}
```

In addition to specifying the async function, input, and cache key, `useAsync` hook also takes a number of additional options for customizing the behavior of the action:

- `active`: indicates whether the action should be run. If set to `false`, you will be responsible for manually running the action using the `run()` method on the returned `AsyncAction` instance. This value can be either a boolean, or a signal that contains a boolean. Defaults to `true`.
- `suspend`: configures whether the hook will suspend while the first run of this async action is running. If `true`, the hook will suspend until the action has resolved or rejected. If `false`, the hook will not suspend, and you will need to handle the `pending` state yourself. Defaults to `true`.
- `cache`: configures whether the action should be cached. If `true`, the default cache from a surrounding `AsyncContext` will be used. If `false`, the action will not be cached. Alternatively, you can pass an `AsyncActionCache` instance to use a specific cache.
- `signal`: an `AbortSignal` that can be used to cancel the action.
- `tags`: an array of strings to include as metadata on a cached `AsyncAction`. These `tags` can be searched for with the `AsyncActionCache`’s `find()`, `filter()`, and `delete()` methods.

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
import {Suspense} from 'preact/compat';
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
import {useEffect} from 'preact/hooks';
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

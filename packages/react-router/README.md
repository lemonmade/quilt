# `@quilted/react-router`

A universal router for React with first-class support for the [WHATWG `URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) and preloading.

## Installation

```bash
$ yarn add @quilted/react-router
```

## Usage

### `<Router />`

The `<Router />` component manages the state of the [current URL](#useCurrentUrl) passed to the rest of the application, provides a [programmatic API](#useRouter) for the application to change the URL, and activates [route-based focus management](#useRouteChangeFocusRef). You **must** render a single `Router` component around all the parts of your app that make use of the hooks and other components this library provides.

The `Router` component accepts the following props:

- `url`: on the client, this component will infer the initial URL from `window.location`. When rendering this component in a non-browser environment, however, there is no way for the component to know what the initial URL should be. You can help the router out by manually providing the initial URL in these cases, which is done by passing a `URL` object to the `url` prop.

  ```tsx
  // Example in Koa, but this can work in any non-browser environment

  import Koa from 'koa';
  import {renderToString} from 'react-dom/server';
  import {Router} from '@quilted/react-router';
  import {App} from './App';

  const app = new Koa();

  app.use((ctx) => {
    ctx.body = renderToString(
      <Router url={ctx.URL}>
        <App />
      </Router>,
    );
  });
  ```

- `prefix`: in many applications, the “root” path for URLs is `/`. However, some complex applications may be entirely hosted under a common URL path, like `/app`. The default `Router` component can handle these cases just fine, but you’d need to always include the prefix when navigating through the application. In the case of `/app` as a prefix, for example, navigating to a `home` route would require navigating to `/app/home`. You can use the `prefix` prop on the router to treat some part of the start of the path as a “prefix” that will automatically be prepended to any paths. Going back to our `/app` example, we could render the router as shown below to allow ourselves to navigate to `/home`, and have it resolve to the full `/app/home` route for us:

  ```tsx
  import {Router, Link} from '@quilted/react-router';

  function App() {
    return (
      <Router prefix="/app">
        <Link to="/home">Home</Link>
        {/* rest of app goes here... */}
      </Router>
    );
  }
  ```

  The `prefix` prop can also be a regular expression. This can be useful in cases where you have identifiers as part of the prefix that are not static.

  ```tsx
  import {Router, Link} from '@quilted/react-router';

  function App() {
    return (
      <Router prefix={/\/product\/\d+}>
        {/*
          assuming the initial URL path is /products/123, this link will resolve to
          /product/123/inventory
        */}
        <Link to="/inventory">Inventory</Link>
        {/* rest of app goes here... */}
      </Router>
    );
  }
  ```

### `<Preloader />`

An important feature of this library is being able to register components to render when the user looks like they are about to navigate to a particular route. You register these preload operations alongside your [route definitions](#useRoutes), but the `Preloader` component is the one that is responsible for actually tracking the route the user intends to navigate to, and rendering the appropriate “preloads”.

The `Preloader` works by listening for mouse and touch events on elements with an `href` attribute (or `data-href`, for rare cases where you can’t use actual links for some navigation elements), figuring out which routes would match that URL, and rendering a component that can start prefetching assets or data for the route, using the [`renderPreload` option of `useRoutes`](#useRoutes).

This capability is not provided by the `Router` because it requires a fair chunk of code to work, and not every application needs these capabilities. If you do want route-based preloading to work, you’ll need to render the `Preloader` component as a child of the `Router`:

```tsx
import {Router, Preloader} from '@quilted/react-router';

function App() {
  return (
    <Router>
      <Preloader>{/* rest of app goes here... */}</Preloader>
    </Router>
  );
}
```

### `useRoutes()`

The `useRoutes` hook lets you conditionally render components in response to the current URL provided by the `Router`. A “route”, in the context of this hook, is a little object that describes what URL it should match, how it should render, and more. You provide this hook with an array of these objects, and it will return a `ReactElement` (or `null`, if no routes matched), which you can return as part of a render method, or as a child to another component.

```tsx
import {useRoutes} from '@quilted/react-router';

// This component must be rendered inside a <Router />, otherwise the current URL
// is not known!
function App() {
  return useRoutes([
    {match: 'home', render: () => <Home />},
    {match: 'products', render: () => <Products />},
    {match: /collection\/\d+/, render: () => <Collection />},
    {render: () => <NotFound />},
  ]);
}
```

Each of these route objects can contain the following fields to control whether the route matches and how it should render:

#### `match`

`match` describes what URLs this route should render on. It can be any of the following types:

- a `string`, in which case it will match any URL with a pathname that exactly matches (note that trailing slashes are always removed before attempting to match). You can either provide an absolute path (starts with a slash, like `/home`), which will attempt to match from the root of the current URL (minus the part taken up by the `Router`’s `prefix` prop), or a relative path (doesn’t start with a slash, like `products`), which will match from the start of the [“remaining” pathname](#relative-routing). Unlike libraries like [react-router](TODO), string matches do not allow match “wildcards”, like `/product/:id`; the behavior of nested routes and the arguments passed to [`render`](#render) are the way this library prefers you extract parts from the path.
- a `RegExp`, in which case it will match any URL with a pathname that matches the regular expression. The regular expression will first try to match against the “remaining pathname” as a relative match, and if that doesn’t work, will then try to match against the root of the current URL as an absolute match.
- a function that takes an [`EnhancedURL` object](#enhancedurl), and returns a boolean indicating whether or not to match.

It can also be omitted entirely to mark this route as a “fallback” — a route without a `match` will match any URL, assuming none of its earlier sibling routes matched.

##### Relative routing

Both string and regular expressions support “relative” matches, represented by paths that don’t include a leading `/`. When rendered at the “root” of your application, a relative match is identical to an absolute one — `home` and `/home` both resolve to `/home` (assuming no router prefix is provided). However, they become distinct when you start nesting routes. Consider this example, where routes are nested by having the `Products` component, which is only rendered on the `products` route, declaring additional, nested routes:

```tsx
import {useRoutes} from '@quilted/react-router';

function App() {
  return useRoutes([
    {match: 'overview', render: () => <Overview />},
    {match: 'products', render: () => <Products />},
    {render: () => <NotFound />},
  ]);
}

function Products() {
  return useRoutes([
    {match: 'overview', render: () => <ProductsOverview />},
    {match: /\d+/, render: () => <ProductDetails />},
    {render: () => <NotFound />},
  ]);
}
```

Note that all `match`es are relative, including the regular expression (which targets a relative URL with only digits as part of the next segment). When the pathname is `/overview`, only the `Overview` component is rendered. When `/products/overview` is rendered however, the `ProductsOverview` component is rendered; first, the `products` match is selected, then, the nested `overview` match is selected from the rendered `Products` component. Similarly, when the pathname is `/products/123`, the `ProductDetails` route is rendered. This works because, when the `products` match is reached and the `Products` component is rendered, a little piece of React context is also rendered to indicate what part of the pathname has been “consumed” so far — in the case of `Products`, this is the `/products` part of the URL. Once the `useRoutes` hook is run in `Products`, it can see that earlier components matched up the `/products`, leaving only `overview`/ `123` as the part of the path that remains to be matched. Relative matches, like the ones defined in `Products`, only attempt to match off of this “remainder”.

While providing a function to `match`, or omitting `match` entirely, can still match a URL, it does not “consume” the route. The example below switches the use of a string `products` match to a function. As a result, the nested routes need to be updated to include the `/products` part of the URL, because the pathname “remainder” still includes the `/products` part:

```tsx
import {useRoutes} from '@quilted/react-router';

function App() {
  return useRoutes([
    {
      match: (url) => url.pathname.startsWith('/products'),
      render: () => <Products />,
    },
  ]);
}

function Products() {
  return useRoutes([
    {match: 'products/overview', render: () => <ProductsOverview />},
    {match: /products\/\d+/, render: () => <ProductDetails />},
  ]);
}
```

All of these behaviors work the same for nested routes defined with the [`children` option on route objects](#children).

#### `children`

The `children` property on a route object allows you to define an array of “child routes”. These routes will only be evaluated for a match when their parent also matches, and they allow for the same kind of nested relative routing described above. In fact, the nested routing example above can be more succinctly implemented using `children`:

```tsx
import {useRoutes} from '@quilted/react-router';

function App() {
  return useRoutes([
    {match: 'overview', render: () => <Overview />},
    {
      match: 'products',
      children: [
        {match: 'overview', render: () => <ProductsOverview />},
        {match: /\d+/, render: () => <ProductDetails />},
        {render: () => <NotFound />},
      ],
    },
    {render: () => <NotFound />},
  ]);
}
```

#### `render`

You’ve seen `render` in action already; it is almost always used on a route object to register a component to render when that route matches. This value should be a function that returns a React element. This function is called with a few helpful arguments:

- `url`: the [`EnhancedURL`](#enhancedurl) object for the current URL in the app.
- `matched`: the part of the path that was matched for **just this route**. This can be useful in nested paths for getting access to a single part of the URL, like an ID, in order to pass it as a prop to the component rendered for that route:

  ```tsx
  import {useRoutes} from '@quilted/react-router';

  function App() {
    return useRoutes([
      {
        match: 'products',
        children: [
          // Assuming a pathname like `/products/123`, `matched` would be `'123'` here.
          {
            match: /\d+/,
            render: ({matched}) => <ProductDetails id={matched} />,
          },
        ],
      },
    ]);
  }
  ```

- `children`: when there are [child routes](#children), the `children` key will be the rendered match from those children (or `null`, if none matched). You **must** include this rendered content in your React element; it is not done automatically for you.

  ```tsx
  import {useRoutes} from '@quilted/react-router';

  function App() {
    return useRoutes([
      {
        match: 'products',
        render: ({children}) => <Products>{children}</Products>,
        children: [{match: /\d+/, render: () => <ProductDetails />}],
      },
    ]);
  }
  ```

#### `redirect`

Instead of declaring `render`, you can provide a `redirect` key on the route definition to redirect from that route to another one. The value for this field can be anything you can pass to the [`useNavigate` hook](#useNavigate).

```tsx
import {useRoutes} from '@quilted/react-router';

function App() {
  return useRoutes([
    {match: '/', render: () => <Home />},
    // Anything that doesn’t match the root route gets redirected there.
    {redirect: '/'},
  ]);
}
```

#### `renderPreload`

This field lets you register a component to render when the user looks like they are about to navigate to this route. The intention is that this component will kick off any data fetching required for that route in such a way that the route will be able to reuse that data on mount, reducing the cost of deferring assets and data per route. In order for this route-based preloading to work, you must render the [`Preloader` component in your application](#Preloader).

The following example shows a component created by [`@quilted/react-async`](../react-async) that is rendered for `/products`, and preloaded when the user is about to navigate to that route:

```tsx
import {useRoutes} from '@quilted/react-router';
import {createAsyncComponent} from '@quilted/react-async';

const Products = createAsyncComponent(() => import('./Products'));

// Remember, you need to render this under **both** a <Router /> and
// <Preloader /> to get routing and route-based preloading.
function App() {
  return useRoutes([
    {
      match: 'products',
      render: () => <Products />,
      renderPreload: () => <Products.Preload />,
    },
  ]);
}
```

The `renderPreload` function is called with a `url` option, which will be a `URL` object representing the URL the user is about to navigate to, and a `matched` option, which provides the part of the URL that matched for only this route (this is identical to the `matched` option provided to [`render()`](#render)).

```tsx
import {useRoutes} from '@quilted/react-router';
import {createAsyncComponent} from '@quilted/react-async';

const ProductDetails = createAsyncComponent({
  load: () => import('./Products'),
});

function App() {
  return useRoutes([
    {
      match: 'products',
      children: [
        {
          match: /\d+/,
          render: ({matched}) => <ProductDetails id={matched} />,
          renderPreload: ({matched}) => <ProductDetails.Preload id={matched} />,
        },
      ],
    },
  ]);
}
```

### `<Link />`

The `Link` component renders a native anchor tag pointing at a route in your application. When this anchor is activated, a client-side navigation will be performed instead of a full-page navigation. However, should JavaScript fail to load, or if JavaScript is still being downloaded, the fact that this is a native anchor tag means that the user will still be able to navigate the application. This component also knows when the user is intending to open a link in a new tab or window, and will allow that navigation to behave normally.

The `Link` component accepts all props you could pass to an anchor element, except for `href`. In place of `href`, this component accepts a `to` prop, which can be any type allowed by [`useNavigate`](#useNavigate).

```tsx
import {Link} from '@quilted/react-router';

export function MyComponent() {
  return <Link to="/products/new">Create product</Link>;
}
```

### `useNavigate()`

When possible, you should use a `Link` component to render navigation elements, as this will allow navigation to work even if your application’s JavaScript fails. In cases where you need to update the current URL programmatically (like navigating only after an asynchronous network call has completed), you can instead use `useNavigate`. This React hook returns a function that you can call later, and when called it will update both the current URL in the `Router`’s state (causing all `useRoutes` definitions to re-evaluate route matches) and updates the URL in the browser.

The value you pass to the `navigate` function can be any of the following types:

- A string, which represents the pathname (and, optionally, hash/ search) you want to navigate to. This string can either be an absolute pathname (starts with a `/`, in which case it will be appended to the router prefix, if any, to form the final path), or a relative pathname (starts with anything other than a `/`, in which case it is appended to the _current URL’s pathname_).
- A `URL` object.
- An object with optional `pathname`, `hash`, and `search` fields. If `pathname` is omitted from this object, it will reuse the current URL’s `pathname`.
- A function that accepts the current URL, and returns one of the other arguments above.

This function also accepts an (optional) second argument with any of the following keys:

- `state`, an object that will be used as location state, and will be accessible through `useCurrentUrl().state` on the next page.
- `replace`, a boolean indicating that this navigation should replace the existing entry in the navigation stack (by default, `navigate` will push a new entry onto the stack).

```tsx
import {useNavigate} from '@quilted/react-router';

function MyComponent() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={async () => {
        await performSomeNetworkRequests();

        // Relative navigation, adds `/new` to the path
        navigate('new');

        // Absolute navigation, goes the /next/page directly
        navigate('/next/page');

        // Replaces instead of pushes to the navigation stack
        navigate('page?from=other-page#with-hash', {replace: true});

        // This search object will be URI-encoded
        navigate({pathname: '/', search: {goto: 'new-page'}});

        // This state will be available as `useCurrentUrl().state` on the next page
        navigate('new', {state: {initialValue: '123'}});

        // This will compote a new URL from the current one
        navigate((currentUrl) => {
          const newUrl = new URL(currentUrl.href);
          newUrl.searchParams.append('extra', 'param');
          return newUrl;
        });
      }}
    >
      Save
    </button>
  );
}
```

### `useRedirect()` and `<Redirect />`

The `useRedirect()` hook gives you a shortcut for navigating to a new route, replacing the current entry in the history stack. It will, in the future, also integrate with `@quilted/react-network` to register a real HTTP redirect when run in a server environment.

This hook accepts a single argument, a `to` value that can be any of the types you can pass to the navigate function returned by `useNavigate`. This library also provides a component version of this hook, `<Redirect />`, where the `to` value is provided via the `to` prop. The component version can be useful since redirects are often conditional on some other application state, and hooks can’t be called conditionally.

```tsx
import {useRedirect, Redirect} from '@quilted/react-router';

export function MyRedirect() {
  useRedirect('/new/route');
  return null;

  // OR:

  return <Redirect to="/new/route" />;
}
```

### `useCurrentUrl()`

Components in your application will often want to know the current URL. This can be particularly useful in cases like analytics, where you want to trigger an event every time the URL changes. The `useCurrentUrl()` hook gives components access to the current [`EnhancedURL`](#enhancedurl). This hook will re-render your component whenever the current URL changes.

```tsx
import {useEffect} from 'react';
import {useCurrentUrl} from '@quilted/react-router';

function useNavigationTracking() {
  const currentUrl = useCurrentUrl();

  useEffect(() => {
    trackButNotInACreepyWayPlease(currentUrl.href);
  }, [currentUrl.href]);
}
```

#### `EnhancedURL`

This library is driven by the `URL` object. In order to support features like location state, however, most of this library actually operates on an augmented version of a `URL`, which is represented by the `EnhancedURL` type. These objects are identical to a `URL` object, except that they are considered fully immutable (mutating properties does not change the current URL), and they contain the following additional properties:

- `state`, an object that is inferred from the location state for this route (you can provide location state by passing the [`state` option to `useNavigate`](#usenavigate)).
- `prefix`, an optional string that represents the part of the URL’s `pathname` that was covered by the `Router`’s `prefix`.
- `normalizedPath`, a string that represents the part of the URL’s `pathname` that was **not** covered by the `Router`’s `prefix`.
- `key`, a string that serves as a unique identifier for the current URL’s position in the navigation stack (so, if a user navigates using the browser back button, this key will be the same as when they were originally on that route).

### `useNavigationBlock()` and `<NavigationBlock />`

Applications sometimes need to block the user from being able to navigate away. While it is generally better to save the state of the page and rehydrate it when the user returns, this is not always possible. `@quilted/react-router` provides a mechanism for blocking all navigation, including the browser’s native back and forward buttons.

The `useNavigationBlock` hook allows you to register a function that can block navigation. This function is called with arguments:

- `url`, an `EnhancedURL` object representing the target location.
- `redo`, a function that you can store and call at a later time that will forcibly perform the navigation, if you decide to block it.

This function should return a boolean. If you return `true`, the navigation will be blocked. Otherwise, the navigation will be performed normally.

Once the component using the `useNavigationBlock` hook is unmounted, the block will no longer be called.

The `NavigationBlock` component behaves the same way, except that the function to determine the block is passed as the `onNavigation` prop.

```tsx
import {useEffect, useRef} from 'react';
import {useNavigationBlock} from '@quilted/react-router';

function Blocker() {
  const redo = useRef<(() => void) | null>(null);

  useNavigationBlock((url, redoNavigation) => {
    redo.current = redoNavigation;
    return !url.pathname.startsWith('/can/always/go/here');
  });

  useEffect(() => {
    return () => {
      if (redo.current != null) {
        redo.current();
      }
    };
  }, []);

  return null;
}
```

### `useScrollRestoration()`

TODO

### `useRouteChangeFocusRef`

TODO

### `useRouter()`

The `router` object, provided by `useRouter`, offers an imperative API for navigating, listening for URL changes, and more. This object is constructed by the `Router` component, and is the basis for all other behaviors of this library.

The router instance has the following methods:

#### `router.navigate()`

This method is identical to the function returned by [`useNavigate()`](#usenavigate).

#### `router.go()`

Allows you to go forwards or backwards through the navigation stack. Accepts an integer for the number of entries to move; negative numbers move backwards.

```tsx
// Back one page
router.go(-1);

// Forward three pages
router.go(3);
```

#### `router.forward()`

An alias for `router.go(1)`.

#### `router.back()`

An alias for `router.go(-1)`.

#### `router.block()`

Blocks the router from performing additional navigations. In general, avoid this method, and use the `useNavigationBlock` hook or `NavigationBlock` component instead.

#### `router.listen()`

Subscribes to changes in the current URL. In general, avoid this method, and use the `useCurrentUrl` hook (and changes to the value it provides) instead.

#### `router.resolve(to)`

Resolves the `to` argument into a `URL`. The `to` can be anything that you would pass to [`useNavigate()`](#usenavigate).

### Testing

This library provides some additional utilities geared specifically towards the need of testing. The following tools can be imported from `@quilted/react-router/testing`:

#### `TestRouter`

The `TestRouter` component mounts the necessary context providers to support the components and hooks detailed above. It accepts a single optional prop, `router`, which should be a router instance.

```tsx
// Example showing usage with react-testing
import {createMount} from '@shopify/react-testing';
import {TestRouter} from '@shopify/react-testing';

export const mount = createMount({
  // uses window.location.href as the base for a test router by default
  render: (element) => <TestRouter>{element}</TestRouter>,
});
```

> **Why take `router` instead of `url`, like the `Router` component?** In tests, you usually want the router to be the front-and-center, because tests may want to spy on its methods to ensure navigation is being performed as expected. In contrast, the router is primarily an implementation detail of application code.

#### `createTestRouter()`

The `createTestRouter` function creates a mock router that matches up the expected shape of a normal router, but that does not actually navigate when `navigate`, `go`, `back`, or `forward` are called. This function accepts an optional `url` argument, which should be a `URL` object representing the location you wish to simulate in your test. If it is not provided, a URL will be constructed that represents the value of `window.location.href`.

```tsx
import {createMount} from '@shopify/react-testing';
import {TestRouter, createTestRouter} from '@quilted/react-router/testing';

export const mount = createMount({
  render: (element, _, {pathname = '/test'}) => (
    <TestRouter router={createRouter(new URL(pathname))}>{element}</TestRouter>
  ),
});

// In tests...
mount(<MyComponent />, {pathname: '/my/path'});
```

# Routing with Quilt

Once your application has more than a single page, you need some way of declaring what pages should be visible. In web applications, we usually use the URL of the browser to control what pages are displayed with the help of a “router”. Quilt provides a powerful router designed to be [composable](./TODO), built on top of the [browser’s `URL` object](https://developer.mozilla.org/en-US/docs/Web/API/URL).

## Getting started

This guide also assumes you have already rendered either of the following from `@quilted/quilt/navigate`:

- a `<Routing>` component, or
- a `<RoutingWithoutPreloading />` component (to remove the bundle size needed to implement [route-based preloading](#route-based-preloading))

These components add the routing-related context to your application. In most of the examples of this guide, we will render a `Routing` component so that the example works as-is. In your own application, you only need to render a single `Routing` or `RoutingWithoutPreloading`, which you will typically do as one of the outermost components in your application.

## Component- versus file-based routing

Frameworks like [Next.js](https://nextjs.org/docs/routing/introduction), [Remix](https://remix.run), [Astro](https://docs.astro.build/core-concepts/astro-pages), and others use a technique called “file-based routing”. In this technique, there is a special directory in your application (usually `pages` or `app`), and the framework expects you to use a specific file naming system to describe what files are rendered for what paths. This technique is very popular, and can reduce a lot of boilerplate for applications that follow a conventional routing scheme.

Quilt **does not** implement file-based routing; there is no special routing-related directory. Routes are entirely declared in React components, using the `routes` prop of the `<Routing />` and `<RoutingWithoutPreloading />` components (or, as shown later, with the `useRoutes()` hook):

```tsx
import {Routing} from '@quilted/quilt/navigate';

const routes = [
  {match: '/', render: <Start />},
  {match: 'products', render: <Products />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <div>Welcome!</div>;
}

function Products() {
  return <div>Products will be listed here.</div>;
}
```

File system routing has several benefits that you do not get with Quilt’s approach:

- Developers do not need to edit any centralized file to add new routes — just add a new file and you’re done!
- Because file system routing framework know up-front what routes you have in your application, they can optimize some runtime behaviors automatically. For example, Remix uses its knowledge of your routes to “lift” data needs for all matched routes (including nested routes) to happen as early as possible.
- Your application’s asset bundles can be split on route boundaries automatically.

Quilt uses a component-based routing system to take a different set of tradeoffs:

- Quilt wants to be a [“component-first” framework](./TODO), which includes the idea that all components in the app have the same capabilities, and components should be freely composable. In most file-based routing setups, route components are in some way “special” (e.g., in Next.js, only route components can define data fetching methods), and you need to invent additional conventions or configuration to enable common composition use cases, like layouts that wrap some routes in your app.
- It is usually impossible to use file-based routing to build an application where the routing scheme is dynamic, based on the data fetched by the application. For example, Shopify’s checkout has a variable number of pages, and different content on each page, depending on the items in a buyer’s cart and the shop’s checkout configuration. When you move routing into application code, you can make it as dynamic as you like.
- Declaring routes in code allows you to attach additional metadata and functionality to the routing scheme. Quilt supports defining how to preload routes and what routes to include for static rendering as part of its `routes` prop and `useRoutes()` hook, which would otherwise need to be defined separately.
- You do not need to adhere to any file naming conventions for routes or other routing-related components, like “layouts” that wrap a subset of your application

If you want to use file system routing, you should use a framework that provides first-class support for them instead of using Quilt.

## Declaring routes

To declare routes for your application, you create a list of route “descriptors” that indicate when a route should match, and what it should render when it matches. Small apps with simple, static routes can use the `routes` prop on the `<Routing />` and `<RoutingWithoutPreloading />` components, which adds the routing feature to your app and registers the provided routes in one step:

```tsx
import {Routing} from '@quilted/quilt';

const routes = [
  {match: '/', render: <Start />},
  {match: 'products', render: <Products />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <div>Welcome!</div>;
}

function Products() {
  return <div>Products will be listed here.</div>;
}
```

In some applications, you may want to customize where the Routes are rendered in your application. For example, you may want to have all routes render inside a top-level “frame” component that provides persistent UI. This can be accomplished using the `useRoutes()` hook, which allows you to register routes — and resolve them into a rendered React element — anywhere in your React tree.

```tsx
import {Link, Routing, useRoutes, type PropsWithChildren} from '@quilted/quilt';

function App() {
  return (
    <Routing>
      <Frame>
        <Routes />
      </Frame>
    </Routing>
  );
}

function Routes() {
  return useRoutes([
    {match: '/', render: <Start />},
    {match: 'products', render: <Products />},
  ]);
}

function Frame({children}: PropsWithChildren) {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/products">Products</Link>
          </li>
        </ul>
      </nav>
      <main>{children}</main>
    </div>
  );
}

function Start() {
  return <div>Welcome!</div>;
}

function Products() {
  return <div>Products will be listed here.</div>;
}
```

When you declare routes with the `routes` prop or the `useRoutes()` hook, Quilt assumes they never change. If your routes do change — for example, they depend on some data about the user that you fetch, or on some piece of context — you can make the routes dynamic by providing a dependency array as the last argument to `useRoutes()`. This dependency array works just like the one you would pass to [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) or [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) hooks.

```tsx
import {Routing, useRoutes, useCookie} from '@quilted/quilt';

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  const userCookie = useCookie('user');

  return useRoutes(
    [
      {
        match: 'me',
        render: () =>
          Boolean(userCookie) ? (
            <AccountWithUser user={userCookie} />
          ) : (
            <AccountWithoutUser />
          ),
      },
    ],
    // If `userCookie` were to change, we’d need the routes to re-render the routes.
    // Any state your routes depend on needs to be included in this dependency
    // array.
    [userCookie],
  );
}

function AccountWithUser({user}: {user: string}) {
  return <div>Welcome, {user}!</div>;
}

function AccountWithoutUser() {
  return <div>Sorry, I’m not sure who you are.</div>;
}
```

### Controlling when routes match

The `match` property describes whether a given route matches the current URL. Quilt will loop through the list of route definitions, and pick the first one that matches. Matches can be defined in a number of different formats:

- As strings. These strings will be compared to the pathname of the current URL, and will match only if the entire pathname matches. The exception is the behavior of leading and trailing slashes. As noted in the [pathname normalization](#pathname-normalization) section, Quilt always strips trailing slashes, so you should not include them in your `match`. Additionally, for route definitions, Quilt allows you to omit the leading slash in route matches, and they will act the same as if you include them. You only ever need to include a leading slash when you are targeting the “root” path.

  ```tsx
  import {Routing} from '@quilted/quilt';

  const routes = [
    {match: '/', render: <Start />},
    {match: 'products', render: <Products />},
    // You could also have provided this match with the leading slash:
    // {match: '/products', render: <Products />},
  ];

  function App() {
    return <Routing routes={routes} />;
  }

  function Start() {
    return <div>Welcome!</div>;
  }

  function Products() {
    return <div>Products will be listed here.</div>;
  }
  ```

- As regular expressions. These regular expressions will be compared to the pathname of the current URL, and will match only if the entire pathname matches. Regular expressions allow you to define “dynamic routes”, which can match many different URLs. As with strings, your regular expressions can omit the leading and trailing slashes from matches.

  ```tsx
  import {Routing} from '@quilted/quilt';

  const routes = [
    {match: '/', render: <Start />},
    // This route matches paths like '/product/1', '/product/2', ...
    {match: /products\/\d+/, render: <Product />},
    // You could also have provided this match with the leading slash:
    // {match: /\/products\/\d+/, render: () => <Products />},
  ];

  function App() {
    return <Routing routes={routes} />;
  }

  function Start() {
    return <div>Welcome!</div>;
  }

  function Product() {
    return <div>A product will be shown here!</div>;
  }
  ```

- A function, which accepts the target URL (as a `URL` instance), and returns a boolean indicating whether the URL matches. This allows you to define arbitrarily complex matches, because you can run any code you want, and compare against more parts of the URL, like search parameters.

  ```tsx
  import {Routing} from '@quilted/quilt';

  const ANIMALS = new Set(['dog', 'cat', 'giraffe', 'panda', 'anteater']);

  const routes = [
    {match: '/', render: <Start />},
    // The URLs have Quilt’s pathname normalization applied, so they always
    // include a leading slash, and never include a trailing slash.
    {
      match: (url) => ANIMAL.has(url.pathname.slice(1)),
      render: <Animal />,
    },
  ];

  function App() {
    return <Routing routes={routes} />;
  }

  function Start() {
    return <div>Welcome!</div>;
  }

  function Animal() {
    return <div>You found an animal!</div>;
  }
  ```

- `undefined`, or omitted entirely. A route description where there is no `match` always matches, no matter what the current URL is. This makes them ideal to implement “fallback” routes, like custom 404 pages. Because these routes always match, they should always come _last_ in the array you pass to `useRoutes()`.

  ```tsx
  import {Routing} from '@quilted/quilt';
  import {useStatusCode} from '@quilted/quilt/http';

  const routes = [{match: '/prize', render: <Prize />}, {render: <NotFound />}];

  function App() {
    return <Routing routes={routes} />;
  }

  function Prize() {
    return <div>You found the prize!</div>;
  }

  function NotFound() {
    useStatusCode(404);
    return <div>Better luck next time!</div>;
  }
  ```

### Rendering matched routes

As we saw in the last section, our routes always included a `render` key, which was a a React element. When the route matches, this element will be rendered to the screen.

Instead of a React element, `render` can also be a function. A `render` function is called only when the route matches, and should return a React element to render. It gets called with with an object that contains some details about the current URL and the match that was made.

The most commonly-needed property on this object is `matched`, which provides a string indicating the part of the pathname that was matched by this route. These matches respect whether the `match` property was constructed to match a relative or absolute path — when you match an absolute path, the leading `/` is included, but when you use a relative one, it is not. If you use a function for `match`, or do not include `match`, `matched` will be the entire (absolute) pathname of the current URL.

```tsx
import {Routing} from '@quilted/quilt';
import {useStatusCode} from '@quilted/quilt/http';

const routes = [
  {
    match: /\d+/,
    render: ({matched}) => <LuckyNumber number={matched} />,
  },
  {render: ({matched}) => <NotFound path={matched} />},
];

function App() {
  return <Routing routes={routes} />;
}

function LuckyNumber({number}: {number: string}) {
  return <div>Lucky number {number}!</div>;
}

function NotFound({path}: {path: string}) {
  useStatusCode(404);

  return (
    <div>
      There’s nothing lucky available at {path}. Try looking for numbers
      instead!
    </div>
  );
}
```

There’s also a `url` property, which gives you access to the current URL (the same one you can read with the [`useCurrentUrl()` hook](#reading-the-current-url), which we will cover soon). You can use this property to access additional parts of the matched URL, like the search params or hash. The routes will re-render whenever the current URL changes, just like components that use the `useCurrentUrl()` hook, so you can use this technique if you prefer to more cleanly separate your routing from your React components.

### Allowing inexact matches

All the `match` properties we’ve seen so far have been treated as “exact” matches — the route will only be rendered if the `match` property matches the entire pathname. You can make it so that the current URL only needs to _start_ with the `match` property before your route is rendered by passing `exact: false`. When you set `exact` to be false, as long as your `match` parameter ends on a path separator (either the `/` character, or the end of the path), it will be rendered.

```tsx
import {Routing, Link} from '@quilted/quilt';

const routes = [
  {
    // Since this match does not need to be exact, this route will be rendered
    // when the URL is `/products`, `/products-legacy`, `/products/search`,
    // `/products-legacy/123`, and any other sub-paths of `/products` or
    // `/products-legacy`. Because your routes still need to be matched on path
    // separator boundaries, this route will **not match** for routes like
    // `/products-list`.
    match: /products(-legacy)?/,
    exact: false,
    // `matched` only returns the part of the pathname that actually matched; there
    // could be more to the pathname than that since we are allowing inexact matches!
    render: ({matched}) =>
      matched === 'products-legacy' ? <ProductsLegacy /> : <Products />,
  },
];

function App() {
  return <Routing routes={routes} />;
}

function Products() {
  return <div>All your product-related needs are here!</div>;
}

function ProductsLegacy() {
  return (
    <div>
      We’ve built a <Link to="/products">new-and-improved product list</Link>{' '}
      that we’d love you to try!
    </div>
  );
}
```

When you allow inexact matches, components you render for the route can themselves use `useRoutes()` to declare additional matches on the _rest_ of the pathname. This is one way to implement child routes, which we’ll discuss in the next section.

### Child routes

Up until now, we have only declared a “flat” list of routes. However, you can nest routes as deeply as you like by passing a `children` property on your route definition. This property must be an array of route definitions, just like the one you pass to the `routes` prop or the `useRoutes()` hook. When you pass the `children` property, a few different things will happen:

- The route will be be allowed to be an inexact match, as if you had set the `exact` property to `false`. This is so that the “child” route definitions can take care of routing additional parts of the path beyond the original match.
- When the route with children is matched, Quilt’s router will remove the part of the path that matched, and will test the child routes, in order, with the **remaining part** of the path.
- As usual, the `matched` property available when you render you component shows the part of the pathname that was matched by **this route only**, excluding parts of the path that matched for “parent” routes. A `consumed` property is also available, which
  indicates what, if any, of the current pathname has been matched by parent routes.

These features are a key part of Quilt’s powerful router. With this system, you can split your routes up into their individual parts, extract useful information out of the URL, and pass it in as props to your React components. The example below shows how you can break up a larger URL into small segments, using the `matched` property to extract dynamic portions of the URL:

```tsx
import {Routing} from '@quilted/quilt';

const routes = [
  {
    match: 'shows',
    children: [
      // Renders for the “root” route, which in this case will be
      // `/shows`, since we are nested under a `shows` match.
      {match: '/', render: <ShowList />},
      {
        // This will match a single additional path portion with only
        // word characters and dashes, like `/shows/kims-convenience`
        // (in that case, `matched` will be `'kims-convenience'`).
        match: /[\w\-]+/,
        render: ({matched}) => <ShowDetails handle={matched} />,
      },
    ],
  },
];

function App() {
  return <Routing routes={routes} />;
}

function ShowList() {
  return <div>Let’s find you something to watch...</div>;
}

function ShowDetails({handle}: {handle: string}) {
  return <div>Here’s some information about {handle}...</div>;
}
```

Routes can be nested as deeply as you like, not just the two levels shown in the previous example.

When a route has `children`, and not `render`, as shown in the previous example, the “parent” route will just render its matched child. If you want to render some components around the matched routes — either to provide UI that persists for all children, or to provide some special additional context — you can still do so by providing the `render` option on your route.

When a route has children, its `render` function is called with a `children` property that is the rendered child route that matched. Make sure you include `children` in your rendered output, otherwise the child routes won’t actually be rendered to the screen!

```tsx
import {Routing, type PropsWithChildren} from '@quilted/quilt';

const routes = [
  {
    match: 'shows',
    // In this case, `children` will include either `ShowList`, `ShowDetails`,
    // or the default “not found” content, depending on the full URL.
    render: ({children}) => <ShowLayout>{children}</ShowLayout>,
    children: [
      {
        match: '/',
        render: <ShowList />,
      },
      {
        match: /[\w\-]+/,
        render: ({matched}) => <ShowDetails handle={matched} />,
      },
    ],
  },
];

function App() {
  return <Routing routes={routes} />;
}

function ShowLayout({children}: PropsWithChildren) {
  return (
    <div>
      <div>
        <Link to="/shows">Shows</Link>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ShowList() {
  return <div>Let’s find you something to watch...</div>;
}

function ShowDetails({handle}: {handle: string}) {
  return <div>Here’s some information about {handle}...</div>;
}
```

We can use the features of the router we’ve covered so far to implement child routes another way, with different tradeoffs. When you allow inexact route matches, the components you render for your routes can also use `useRoutes()`. The router keeps track of the part of the pathname that has been “consumed” from each `useRoutes()`, and nested routes are only tested **against the remaining part of the pathname**.

Here’s the same routing structure as the previous example, but built using nested `useRoutes()` instead of child routes:

```tsx
import {Routing, useRoutes, type PropsWithChildren} from '@quilted/quilt';

const routes = [
  {
    match: 'shows',
    // Needs to allow inexact matches so that we can match against the
    // remainder of the path in our `Shows` component.
    exact: false,
    render: <Shows />,
  },
];

function App() {
  return <Routing routes={routes} />;
}

function Routes() {
  return useRoutes([
    {
      match: 'shows',
      // Needs to allow inexact matches so that we can match against the
      // remainder of the path in our `Shows` component.
      exact: false,
      render: () => <Shows />,
    },
  ]);
}

function Shows() {
  const routes = useRoutes([
    {match: '/', render: <ShowList />},
    {
      match: /[\w\-]+/,
      render: ({matched}) => <ShowDetails handle={matched} />,
    },
  ]);

  return <ShowLayout>{routes}</ShowLayout>;
}

function ShowLayout({children}: PropsWithChildren) {
  return (
    <div>
      <div>
        <Link to="/shows">Shows</Link>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ShowList() {
  return <div>Let’s find you something to watch...</div>;
}

function ShowDetails({handle}: {handle: string}) {
  return <div>Here’s some information about {handle}...</div>;
}
```

If you want to split your routes across multiple bundles (by using [async components](./async.md)), or if your nested routes depend on data in a complex way, you may prefer splitting your routes across components like this. However, there are a few differences between this approach and the child routes shown in the previous example:

- If you use [route-based preloading](#route-based-preloading), only `useRoutes()` that are actually rendered can be preloaded. Quilt can’t preload routes that it doesn’t know about yet, and when you “hide” routes behind a component like this, Quilt won’t discover them until the parent route matches.
- If you use the `notFound` property to customize the behavior [when no routes match](#handling-urls-that-dont-match), it only applies to the `useRoutes()` call it was used it — it is not automatically inherited by descendants that also `useRoutes()`.

### Redirecting from one route to another

> **Note:** In general, we recommend implementing redirects somewhere earlier in the network stack, before your application is rendered at all. While Quilt has good support for redirects, rendering your application is a slow way to discover that you need to redirect the user. We only recommend using the features described below when the redirects are tied to the data you fetch for the rest of your application. This technique also does not work when using [streamed server rendering](./TODO).

Sometimes, you need to redirect the user from one route to another. Maybe you’ve changed the path a feature is available at, or you want to redirect common misspellings of a route to the correct spot. Quilt provides a `Redirect` component that can render for a route that will accomplish this task:

```tsx
import {Routing, Redirect} from '@quilted/quilt';

const routes = [
  {
    match: 'products',
    render: <Products />,
  },
  {
    match: 'product',
    render: <Redirect to="/products" />,
  },
];

function App() {
  return <Routing routes={routes} />;
}

function Products() {
  return <div>All your product-related needs are here!</div>;
}
```

When you perform a redirect on the server, Quilt will bail out of its server rendering process, set a `302` status code, and set the `Location` header to the URL resolved from the `to` prop. When a `Redirect` is rendered on the client, it will perform a navigation with the router, replacing the current page in the history stack.

The `to` prop on `Redirect` works the same way as the [`Link` component](#navigating-between-routes). It can be an absolute path, which will be relative to the root of your app; a relative path (without a leading `/`), which will be relative to the current URL; a `URL` object; an object with optional `path`, `search`, and `hash` keys; or a function that takes the current URL, and returns any of the above.

All of these redirects in the next example would go to `/redirected`:

```tsx
import {Routing, Redirect} from '@quilted/quilt';

const routes = [
  {
    match: '/',
    render: ({url}) => {
      return (
        <Redirect to="/redirected" />
        // <Redirect to="redirected" />
        // <Redirect to={new URL('redirected', url)} />
        // <Redirect to={{path: '/redirected'}} />
        // <Redirect to={(currentUrl) => new URL('/redirected', currentUrl)} />
      );
    },
  },
  {
    match: 'redirected',
    render: <div>Redirected!</div>,
  },
];

function App() {
  return <Routing routes={routes} />;
}
```

As a convenience, if you are just redirecting one route to another, you can use the route’s `redirect` property instead of rendering a `Redirect` component. This property can be any of the types allowed in the `<Redirect />`’s `to` prop:

```tsx
import {Routing, Redirect} from '@quilted/quilt';

const routes = [
  {
    match: '/',
    redirect: '/redirected',
    // or redirect: 'redirected',
    // or redirect: new URL('redirected', url),
    // or redirect: {path: '/redirected'},
    // or redirect: (currentUrl) => new URL('/redirected', currentUrl),
  },
  {
    match: 'redirected',
    render: <div>Redirected!</div>,
  },
];

function App() {
  return <Routing routes={routes} />;
}
```

### Handling URLs that don’t match

By default, if no routes match the current URL, Quilt will render a `<NotFound />` component. The `<NotFound />` component sets a 404 status code, and does not render any UI. If you want to provide a custom “not found” page, you can do so by registering a route without a `match` property as your last route:

```tsx
import {Routing} from '@quilted/quilt';
import {useStatusCode} from '@quilted/quilt/http';

const routes = [{match: '/prize', render: <Prize />}, {render: <NotFound />}];

function App() {
  return <Routing routes={routes} />;
}

function Prize() {
  return <div>You found the prize!</div>;
}

function NotFound() {
  useStatusCode(404);
  return <div>Better luck next time!</div>;
}
```

This works great, but if you define child routes, your custom “not found” route will not be rendered if Quilt matches a parent route, but fails to match a child:

```tsx
import {Routing} from '@quilted/quilt';
import {useStatusCode} from '@quilted/quilt/http';

const routes = [
  {
    match: 'shows',
    children: [
      {match: '/', render: <ShowList />},
      // If `shows` matched, but no `children` matched, Quilt goes
      // back to rendering its default, no-UI 404 page; it does not go
      // back “up the stack” to try to find a fallback route.
      //
      // If we wanted our `NotFound` component to get rendered for routes
      // like `/shows/abc`, we’d need to declare it as a fallback route
      // in this list, too:
      // {render: <NotFound />},
    ],
  },
  {render: <NotFound />},
];

function App() {
  return <Routing routes={routes} />;
}

function ShowList() {
  return <div>All your shows are listed here.</div>;
}

function NotFound() {
  useStatusCode(404);
  return <div>We seem to have misplaced this content!</div>;
}
```

If you want to customize the content that gets rendered when no route matches, _regardless of where it happens in your route definition_, you can instead pass a `notFound` option as the second argument to `useRoutes()`. This option should be a function that returns a React element, and it will be rendered when no route fully matches the URL:

```tsx
import {Routing, useRoutes} from '@quilted/quilt';
import {useStatusCode} from '@quilted/quilt/http';

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  return useRoutes(
    [
      {
        match: 'shows',
        children: [{match: '/', render: () => <ShowList />}],
      },
    ],
    {notFound: () => <NotFound />},
  );
}

function ShowList() {
  return <div>All your shows are listed here.</div>;
}

function NotFound() {
  useStatusCode(404);
  return <div>We seem to have misplaced this content!</div>;
}
```

## Reading the current URL

It’s very common to read the current URL in application code. You may want to know the [query string parameters](https://developer.mozilla.org/en-US/docs/Web/API/URL/searchParams) that are currently set, or you may need to report changes in the URL to an analytics service. The `useCurrentUrl()` hook gives components access to the current URL, and will re-render your component whenever the current URL changes.

```tsx
import {useCurrentUrl} from '@quilted/quilt';

export function SearchFromCurrentUrl() {
  const currentUrl = useCurrentUrl();

  return <div>Current search: {currentUrl.searchParams.get('search')}</div>;
}
```

The object returned from `useCurrentUrl()` is a special `EnhancedURL` object. These objects are identical to the [native `URL` object](https://developer.mozilla.org/en-US/docs/Web/API/URL), except that they are considered fully immutable (mutating properties does not change the current URL), and they contain the following additional properties:

- `state`, an object that is set to the location state for this route (you can provide location state by passing the [`state` option when navigating between routes](#passing-state-between-routes)).
- `prefix`, an optional string that represents the part of the URL’s `pathname` that was covered by the [router “prefix”](router-prefixes).
- `normalizedPath`, a string that represents the part of the URL’s `pathname` that was **not** covered by the `Router`’s `prefix`.
- `key`, a string that serves as a unique identifier for the current URL’s position in the navigation stack (so, if a user navigates using the browser back button, this key will be the same as when they were originally on that route).

### Reading parts of the pathname as parameters

In many other routing systems, routes are declared using a special syntax that allows you to assign path parts as special parameters that can be read in your component. For example, in [React Router](https://reactrouter.com/web/example/url-params), you could define the following components to read the first part of the URL as an `id` “param”:

TODO: check if still valid

```tsx
import {Link, RouterProvider, createBrowserRouter} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <List />,
  },
  {
    path: '/:id',
    element: <Detail />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

function List() {
  // You would probably fetch this from a server, potentially using
  // React Router’s `loader` system.
  const items = ['1', '2'];

  return (
    <ul>
      {data.map((item) => (
        <li key={item}>
          <Link to={item}>Go to item {item}</Link>
        </li>
      ))}
    </ul>
  );
}

function Detail() {
  const {id} = useParams();

  return <p>ID: {id}</p>;
}
```

In Quilt, there is no notion of “URL parameters”. Instead, the expectation is that your child components accept any information they need as props, and you can use the router’s matching patterns to capture information from the URL:

```tsx
import {Routing, Link} from '@quilted/quilt';

const routes = [
  {match: '/', render: <List />},
  {match: /\w+/, render: ({matched}) => <Detail id={matched} />},
];

function App() {
  return <Routing routes={routes} />;
}

function List() {
  // You would probably fetch this from a server, potentially using
  // react-query or swr.
  const items = ['1', '2'];

  return (
    <ul>
      {data.map((item) => (
        <li key={item}>
          <Link to={item}>Go to item {item}</Link>
        </li>
      ))}
    </ul>
  );
}

function Detail({id}: {id: string}) {
  return <p>ID: {id}</p>;
}
```

Not everyone will prefer Quilt’s approach — there’s definitely advantages to having a special syntax for extracting information from the path! Quilt prefers its more explicit approach because it is [easier to make type-safe](./TODO).

### Reading the URL to manually check for route matches

Usually, you’ll want to use the `useRoutes()` hook to define what components are rendered in response to the current route. Sometimes, though, you may need to read match details directly so that you can render more complicated component structures.

Quilt provides a `useRouteMatch()` hook that runs the route matching calculation on the provided matching pattern, and returns a boolean indicating whether or not that pattern matches. This match determination takes into account the currently “consumed” path, and so supports the same relative routing patterns as the `useRoutes()` hook.

```tsx
import {Routing, useRouteMatch} from '@quilted/quilt';
// We pass `exact: false` so that any route that starts with `/top-secret`
// matches. We will check whether there is an additional `prize` part of
// the route in our `TopSecretArea` component.

const routes = [
  {
    match: 'top-secret',
    exact: false,
    render: <TopSecretArea />,
  },
];

function App() {
  return <Routing routes={routes} />;
}

// This component will render `You found the prize!` when the route is:
//
// /top-secret/prize?password=please
//
// On any other route under /top-secret, or with the wrong password, it
// will render `Nothing to see here.`
function TopSecretArea() {
  const isOnPrizeRoute = useRouteMatch('prize');
  const hasCorrectPassword = useRouteMatch(
    (url) => url.searchParams.get('password') === 'please',
  );

  return isOnPrizeRoute && hasCorrectPassword ? (
    <p>You found the prize!</p>
  ) : (
    <p>Nothing to see here.</p>
  );
}
```

## Navigating between routes

Declaring routes isn’t very useful if you can’t navigate between them. Quilt provides a few ways of navigating around your application, and the most important of them is the `<Link />` component. This component renders an actual HTML [anchor (`<a>`) element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a) that targets the route you pass as the `to` prop. Because it renders an HTML element, `<Link />` works whether JavaScript has loaded on the page or not, which makes it ideal for any piece of UI that triggers navigation.

```tsx
import {Routing} from '@quilted/quilt';

const routes = [
  {match: 'thing-one', render: <ThingOne />},
  {match: 'thing-two', render: <ThingTwo />},
];

function App() {
  return <Routing routes={routes} />;
}

function ThingOne() {
  return <Link to="/thing-two">Over to Thing Two!</Link>;
}

function ThingTwo() {
  return <Link to="/thing-one">Over to Thing One!</Link>;
}
```

The `to` prop you can pass to a `<Link />` can be any of the following types:

- A string, which will be used as the pathname (and, optionally, hash/ search) you want to navigate to. This string can either be an absolute pathname (starts with a `/`), in which case it will be used as the full pathname, or a relative pathname (starts with anything other than a `/`), in which case it is appended to the current URL’s pathname.
- A `URL` object.
- An object with optional `pathname`, `hash`, and `search` fields. If `pathname` is omitted from this object, it will reuse the current URL’s `pathname`. If `hash` or `search` are omitted, they default to empty strings.
- A function that accepts the current URL, and returns one of the other arguments above.

```tsx
import {Link} from '@quilted/quilt';

function MyComponent() {
  return (
    <>
      {/* Relative link, adds `/new` to the path */}
      <Link to="new">To ./new</Link>

      {/* Absolute link, goes the /next/page directly */}
      <Link to="/blog">To /blog</Link>

      {/* You can include hashes and query strings for relative and absolute strings */}
      <Link to="/blog?from=MyComponent#important-part">To /blog</Link>

      {/* You can also pass all the URL parts in an object */}
      <Link
        to={{
          path: '/blog',
          hash: 'important-part',
          // `search` can be an object, where the entries will be URL encoded
          // as search params, a `URLSearchParams` object, or a string that
          // will be parsed as a query string.
          search: {from: 'MyComponent'},
        }}
      >
        To /blog
      </Link>

      {/* A function, which takes the current URL and returns any of the above types */}
      <Link
        to={(currentUrl) => {
          // This would be equivalent to just returning `'new'`, since we are
          // effectively creating a relative link.
          return new URL('new', currentUrl);
        }}
      >
        To ./new
      </Link>
    </>
  );
}
```

In all of these cases, the values passed to the `to` prop are resolved to a string and used as the `href` prop on the resulting `<a>` element. When the resolved URL is to a separate domain, the component will allow the browser to perform a “normal” full-page navigation; in all other cases, the component will instead perform a navigation with the [history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API), which navigates without a full-page reload. You can force a full-page navigation regardless of the resolved URL by setting the `external` prop to `true`:

```tsx
import {Link} from '@quilted/react-router';

function MyComponent() {
  return (
    <Link to="/a-page-served-by-a-separate-application" external>
      Learn more about shipping the org chart
    </Link>
  );
}
```

In addition to the `external` and `to` props, you can also pass any prop (other than `href`) to the `<Link />` component that is supported by the `<a>` element:

```tsx
import type {ComponentProps} from 'react';
import {Link} from '@quilted/react-router';

// A custom Link that accepts the same props as the `<Link />` component,
// but adds a few custom props that are passed through to the `<a>` element.
function MyLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className="Link" data-custom-link />;
}
```

### Navigating programmatically

The `<Link />` component covers the common case for navigation: in response to user clicks and presses. Sometimes, you may want to navigate in response to other events. A particularly common case of this is when a user tries to create a resource in your application; you may want to make an API call to create the resource, and if that operation is successful, navigate the user to a page devoted to it.

To accomplish these special navigation behaviors, Quilt provides a `useNavigate()` hook. This hook returns a function that you can use to navigate anywhere in your application. The first argument that this function accepts is a `to` argument, which can be any of the types allowed in the `to` prop of the `<Link />` component:

```tsx
import {useNavigate} from '@quilted/quilt';

function MyComponent() {
  const navigate = useNavigate();

  return (
    <Form
      onSubmit={async (data) => {
        const result = await fetch('/api/create', {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // In reality, we probably need to make sure this component
        // is still mounted, and do something quite a bit better for
        // handling error cases!
        if (result.ok) {
          // Relative link, adds /success to the path
          navigate('success');

          // or...

          // Absolute link, goes directly to /success
          navigate('/success');

          // or...

          // You can include hashes and query parameters in the path, too!
          navigate('/success?from=Form');

          // or...

          // You can also pass all the URL parts in an object
          navigate({path: '/success', search: {from: 'Form'}});

          // or...

          // A function that takes the current URL and returns any of the
          // other acceptable values
          navigate((currentUrl) => new URL('success', currentUrl));
        }
      }}
    />
  );
}
```

TODO: add a good return type that handles suspense, async stuff, blockers

### Replacing the current URL

When you use `<Link />` or `useNavigate()` to navigate between routes, Quilt will add the new page to the history stack. This means that the user can press the back and forward buttons in the browser to traverse through their history.

Sometimes, you may want a navigation to _replace_ the current entry in the history stack, so that users can’t navigate back to it. This is commonly needed when your application deletes a resource from its “show” page — in this case, we often want to navigate the user back to the “list” page, and prevent them from accidentally getting back to the since-deleted resource.

Quilt lets you accomplish this both with the `<Link />` component and the function returned by `useNavigate()`. When rendering a link, pass the `replace` prop to have the navigation performed by that link replace the current URL:

```tsx
import {Link, Routing} from '@quilted/quilt';

const routes = [
  {match: '/home', render: <Home />},
  {match: '/dead-end', render: <DeadEnd />},
];

export function App() {
  return <Routing routes={routes} />;
}

function Home() {
  return <p>Welcome home!</p>;
}

function DeadEnd() {
  // Note that, if JavaScript hasn’t loaded, this will perform a full-page
  // navigation, leaving the `/dead-end` route in the history stack. There
  // is no way to perform a “replacement navigation” without JavaScript.
  return (
    <Link to="/home" replace>
      Go home and forget this ever happened!
    </Link>
  );
}
```

If you’re using `useNavigate()`, pass `{replace: true}` to the navigate function to replace the current route with a new one:

```tsx
import {useNavigate} from '@quilted/quilt';

export function DeleteProductButton({id}: {id: string}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={async () => {
        await deleteProduct(id);
        navigate('/products', {replace: true});
      }}
    >
      Delete product
    </button>
  );
}

async function deleteProduct() {
  // insert business logic here :)
}
```

Note that Quilt always defaults to replacing the current entry in the history stack if you attempt to navigate to the exact same URL.

### Passing state between routes

You sometimes need to pass state from one route to the next. Maybe you just created a resource and navigated to a route that displays more details, and want to have that route display a special message for the newly-created object. Or, maybe you want to know what route the user came from so you can present a persistent piece of UI to navigate back.

There are many ways to solve this problem. Quilt’s router lets you include query parameters on navigation, which is one common way we might pass information between routes. However, query parameters are included in the URL the user sees, which you might not always want. Instead of query parameters, you could also use client-side storage (like `localStorage`), or persist it to your own database and read it with an API call on the next page.

Quilt provides one additional mechanism for passing state between routes that does not include the content in the URL, and does not require you to use any client or server storage. It uses the [browsers’s `history.state` API](https://developer.mozilla.org/en-US/docs/Web/API/History/state) under the hood to associate state with individual route navigations. You provide the history state by including the `state` option when navigating. The `state` option should be an object, and should have only JSON-serializable values (so, no functions, class instances, or data structures like `Map` or `Set`). The history state is then made available to the target route through the `state` field on the URL returned by `useCurrentUrl()`:

```tsx
import {Link, Routing, useCurrentUrl} from '@quilted/quilt';

enum Path {
  TheEasyWay,
  TheHardWay,
}

const routes = [
  {match: 'the-easy-way', render: <TheEasyWay />},
  {match: 'the-hard-way', render: <TheHardWay />},
  {match: 'destination', render: <Destination />},
];

function App() {
  return <Routing routes={routes} />;
}

function TheEasyWay() {
  return (
    <Link to="/destination" state={{from: Path.TheEasyWay}}>
      Take a stroll to your destination!
    </Link>
  );
}

function TheHardWay() {
  return (
    <Link to="/destination" state={{from: Path.TheHardWay}}>
      Fight your way to your destination!
    </Link>
  );
}

function Destination() {
  const currentUrl = useCurrentUrl();
  const state: {from?: Path} = currentUrl.state;

  switch (state.from) {
    case Path.TheEasyWay: {
      return <p>Way to take the easy path!</p>;
    }
    case Path.TheHardWay: {
      return <p>Congratulations on making it through, enjoy your stay!</p>;
    }
    default: {
      return <p>Wow, how’d you even get here?</p>;
    }
  }
}
```

This feature only works for client-side navigations controlled by JavaScript; if JavaScript has not loaded, there is no way to navigate with history state.

## Advanced routing features

### Pathname normalization

Quilt makes a major simplification on “normal” URLs: any `/` characters appearing at the end of the path are removed. When you [declare routes](#declaring-routes) or [navigate between them](#navigating-between-routes), Quilt’s router will treat any path ending with `/` as being interchangeable with the non-`/` version — for example, `/me/` is exactly the same route as `/me`. When Quilt is controlling the navigation (either through the `<Link />` component or the `navigate()` method), it will always remove the trailing `/` characters automatically.

Some applications can definitely find creative uses for differentiating paths with and without trailing `/`s. However, we believe most applications do not need this feature, and benefit from the “cleaner” URLs you get from removing those characters.

### Route-based preloading

An important performance optimization technique for JavaScript applications is [code splitting](https://developer.mozilla.org/en-US/docs/Glossary/Code_splitting): only loading the assets for the features on the screen. Routes are an ideal place to do this, as each route acts as a logical “split point” for code in your application. Quilt’s [async components](./async.md#asynchronous-components) pair well with the router to implement route-based splitting:

```tsx
import {Routing, createAsyncComponent} from '@quilted/quilt';

const Start = createAsyncComponent(() => import('./Start.tsx'));
const Products = createAsyncComponent(() => import('./Products.tsx'));

const routes = [
  // Now, if `/` is rendered, only the code for `Start` is loaded; if
  // `/products` is rendered, only the code for `Products` is loaded; and
  // for any other URL, no extra code is loaded!
  {match: '/', render: <Start />},
  {match: 'products', render: <Products />},
];

function App() {
  return <Routing routes={routes} />;
}
```

This technique is great, but there’s a problem: the code for the component is only loaded once we navigate to the route that renders it. This creates a kind of “waterfall” — the user clicks, then there is a network request to fetch the route’s JavaScript and CSS, and only then is the component rendered. If that component needs to do additional network calls — say, to load data, or to load additional, nested async components — those get added to the end of the waterfall, leading to an even longer delay for the user.

Quilt provides a way to help minimize this performance issue for the common case of preloading asynchronous components used as routes. Quilt will listen for hover, focus, and click events on all `Link` components you render. When Quilt determines that the `Link` is about to be pressed (either because it is already being pressed, or because the user has continued to focus on the element for at least 150 milliseconds), it will render the result of all `renderPreload()` functions for routes that match the link’s target URL. This preloading logic intelligently scales back when it detects that the user has activated a [“data saver” mode](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData); in those cases, only clicks, and not hovers or focuses, will activate preloading.

Because this feature adds event listeners to all your links, you have to opt in to it. You can do this by wrapping your app either in Quilt’s `<RoutingWithoutPreloading />` or `<RoutePreloading />` components. Once you’ve got this additional wrapper, you can define the `renderPreload` field on your routes. If you use [Quilt’s `createAsyncComponent()` function](./async.md#asynchronous-components) to create your async components, those components will have a `Preload` component you can render to preload your route. By default, this will preload the JavaScript and CSS for the async component, and you can add [custom preloading logic](./async.md#customizing-preloading) to preload data, too.

```tsx
import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {createAsyncComponent} from '@quilted/quilt/async';

const Start = createAsyncComponent(() => import('./Start.tsx'));
const Products = createAsyncComponent(() => import('./Products.tsx'));

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  return useRoutes([
    {
      match: '/',
      render: <Start />,
      renderPreload: <Start.Preload />,
    },
    {
      match: 'products',
      render: <Products />,
      renderPreload: <Products.Preload />,
    },
  ]);
}
```

You can customize some aspects of preloading with the `preload` prop on the `Link` component. If you want to force a link to preload immediately, even if it is not being interacted with, you can set its `preload` prop to `true`:

```tsx
import {Routing, Link, useRoutes} from '@quilted/quilt/navigate';
import {createAsyncComponent} from '@quilted/quilt/async';

const StepTwo = createAsyncComponent(() => import('./StepTwo.tsx'));

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  return useRoutes([
    {
      match: 'step-one',
      render: <StepOne />,
    },
    {
      match: 'step-two',
      render: <StepTwo />,
      renderPreload: <StepTwo.Preload />,
    },
  ]);
}

function StepOne() {
  // We will force this to preload immediately, because we expect the
  // user will always go to the next step.
  return (
    <Link to="/step-two" preload>
      On to the next step!
    </Link>
  );
}
```

If you want to completely disable preloading for a link, you can set the `preload` prop to `false`.

Sometimes, you don’t render a `Link`, but you know you will be navigating to a specific route. This often happens when you are [navigating programmatically](#navigating-programmatically), like when you navigate after deleting a resource. For these more advanced use cases, you can use the `usePreloadRoute()` hook. This hook accepts a `to` argument that can be any of the values you can pass as the [`Link`’s `to` prop](#navigating-between-routes), or a falsy value. When the first argument is not falsy, Quilt will resolve it to a URL, match it against all the routes you’ve declared, and render the `renderPreload()` property for any route that matches.

In the next example, we’ve added route-based preloading to our programmatic navigation example, so that the list page is already preloaded by the time we delete the product and navigate back to our product list:

```tsx
import {useState} from 'react';
import {useNavigate, usePreloadRoute} from '@quilted/quilt/navigate';

export function DeleteProductButton({id}: {id: string}) {
  const navigate = useNavigate();
  const [preload, setPreload] = useState(false);

  // When we click, we’ll start preloading `/products`; until then,
  // we’ll pass `false`, so no route is preloaded.
  usePreloadRoute(preload && '/products');

  return (
    <button
      type="button"
      onClick={async () => {
        setPreload(true);
        await deleteProduct(id);
        navigate('/products', {replace: true});
      }}
    >
      Delete product
    </button>
  );
}

async function deleteProduct() {
  // insert business logic here :)
}
```

### Controlling static rendering

As we discuss in the [static rendering guide](./static-rendering.md), Quilt can render your application to static HTML files. Quilt will run your application, and will automatically detect the routes you declare in order to render each one in turn. Imagine the following example application:

```tsx
import {Routing, Link} from '@quilted/quilt/navigate';

const routes = [
  {match: '/', render: <Start />},
  {
    match: 'shows',
    children: [
      {match: '/', render: <ShowList />},
      {
        match: /[\w\-]+/,
        render: ({matched}) => <ShowDetails handle={matched} />,
      },
    ],
  },
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <Link to="/shows">Go find some shows to watch!</Link>;
}

function ShowList() {
  return <div>All your shows will be listed here.</div>;
}

function ShowDetails({handle}: {handle: string}) {
  return <div>Details for {handle} will be here.</div>;
}
```

In this application, Quilt will automatically detect and render the following routes without any extra configuration on your part:

- `/`, the explicitly declared route that renders `Start`.
- `/shows`, the explicitly declared route that renders `ShowList`.
- `/*`, a fallback route that sets the status code to 404. This route is created implicitly by Quilt. You can disable it entirely by passing `{notFound: false}` as the third option of the `useRoutes` hook, or you can provide your own fallback as documented in the guide to [handling URLs that don’t match](#handling-urls-that-dont-match).

Any route declared with a `match` property using a regular expression or function are excluded from static rendering. This is because there is no way for Quilt to know what dynamic path parts to render — there are an infinite number of routes that could match!

You can teach Quilt what matches to render during static rendering using the `renderStatic` property of a route. This property should be a function, which can return either an array of path parts to render, or a promise for an array of path parts to render. We can update our earlier example to force Quilt to render our dynamic `/shows/{handle}` route with a few matches:

```tsx
import {Routing, Link} from '@quilted/quilt/navigate';

const routes = [
  {match: '/', render: () => <Start />},
  {
    match: 'shows',
    children: [
      {match: '/', render: () => <ShowList />},
      {
        match: /[\w\-]+/,
        render: ({matched}) => <ShowDetails handle={matched} />,
        renderStatic: () => ['survivor', 'ted-lasso', 'tuca-and-bertie'],
      },
    ],
  },
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <Link to="/shows">Go find some shows to watch!</Link>;
}

function ShowList() {
  return <div>All your shows will be listed here.</div>;
}

function ShowDetails({handle}: {handle: string}) {
  return <div>Details for {handle} will be here.</div>;
}
```

Now, in addition to the routes that were statically rendered before, Quilt will automatically render the following routes:

- `/shows/survivor`
- `/shows/ted-lasso`
- `/shows/tuca-and-bertie`

If you want to prevent a route from being statically rendered, you can set its `renderStatic` property to `false`:

```tsx
import {Routing, Link} from '@quilted/quilt/navigate';

const routes = [
  {match: '/', render: <Public />},
  {match: 'admin', renderStatic: false, render: <Admin />},
];

function App() {
  return <Routing routes={routes} />;
}

function Public() {
  return <div>Here’s some public content.</div>;
}

function Admin() {
  return (
    <div>
      This content is only for admins, we’ll server render this with a server
      that checks authentication.
    </div>
  );
}
```

### Router prefixes

Sometimes, all the routes in your application are nested under a particular path. This can happen when you have a single domain that is powered by multiple different web applications, each taking care of a discrete piece of functionality.

Quilt provides a convenience for applications that use this strategy. It’s called a “router prefix”: you declare some part of the pathname that is constant for all URLs in your application by passing a `prefix` prop on the router component. For example, let’s imagine we are deploying an application where all URLs are nested under `/admin`:

```tsx
import {Routing, Link} from '@quilted/quilt/navigate';

const routes = [
  // This route will render when the full path is `/admin`
  {match: '/', render: <Start />},
  // This route will render when the full path is `/admin/account`
  {match: 'account', render: <Account />},
];

function App() {
  return <Routing prefix="/admin" routes={routes} />;
}

function Start() {
  return (
    <div>
      <Link to="/account">Account</Link>
    </div>
  );
}

function Account() {
  return (
    <div>
      <div>
        <Link to="/">Go home</Link>
      </div>
      <div>Your account details will be here.</div>
    </div>
  );
}
```

When you declare a router prefix, a number of things happen automatically:

- Your routes are automatically nested under the router prefix. As you can see in the example above, we did not declare any route that matched the `admin` path part, because that part will be “stripped” from the URL before attempting to find a match.
- All ways of [navigating between routes](#navigating-between-routes), including the `Link` component and `useNavigate()` hook, do not need to include the router prefix. In the example above, you can see that we linked to `/` and `/account`, even though the full pathname would include the `/admin` prefix. If you ever need to navigate to a path that is relative to the root of the domain, rather than the router prefix, you can pass `'root'` as the `relativeTo` option when navigating.
- Quilt includes two additional properties on the `EnhancedURL` object you get from [`useCurrentUrl()`](#reading-the-current-url). `prefix` is a string representing the part of the pathname that was taken up by the prefix, and `normalizedPath` provides the pathname excluding the prefix.

If your prefix is dynamic (for example, it includes a token, handle, or some other identifier), you can pass a regular expression as the `prefix` prop instead of a string.

### Scroll restoration

When you use an `<a>` element to link between URLs in your application _without_ the help of a client-side routing, the browser handles the scroll position of the page in a special way. If you are partially scrolled down the page, navigate to a new page, and then navigate back using the browser’s back button, the browser will restore your scroll position on the original page.

This is a great feature for users, because it means they return right back to the same context they navigated from. However, if you use the `history.pushState()` API directly, you will lose this default behavior.

Quilt recreates this feature for its client-side navigations, with the ability for you to customize scroll restoration for more complex scrolling layouts.

If you do nothing at all, Quilt will automatically measure the scroll position of the HTML element just before a route change, and restore the scroll position when the user returns to this entry in the history stack. This should work for most applications.

Quilt will default to persisting scroll measurements to [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), which lets the behavior to persist across page refreshes. You can provide a custom persistence strategy by passing the `scrollRestoration` prop to `Router`. Quilt provides a few helpers, like `createSessionStorageScrollRestoration()` and `createMemoryScrollRestoration()`, for constructing customized approaches to persisting scroll positions.

```tsx
import {Routing, Link} from '@quilted/quilt/navigate';
import {createMemoryScrollRestoration} from '@quilted/react-router';

// Some applications may not be able to access `sessionStorage`. This
// helper function creates a scroll restoration strategy that just stores
// scroll measurements in memory.
const inMemoryScrollRestoration = createMemoryScrollRestoration();

const routes = [
  {match: 'one', render: <One />},
  {match: 'two', render: <Two />},
];

function App() {
  return (
    <Routing routes={routes} scrollRestoration={inMemoryScrollRestoration} />
  );
}

function One() {
  return <div>Page one!</div>;
}

function Two() {
  return <div>Page two!</div>;
}
```

If you have a custom scroll container for your app, you can call the `useRouteChangeScrollRestoration()` hook, which provides a [ref](https://reactjs.org/docs/refs-and-the-dom.html) you can use to designate the right element to measure and scroll:

```tsx
import {
  Routing,
  useRouteChangeScrollRestoration,
} from '@quilted/quilt/navigate';
import type {PropsWithChildren} from '@quilted/quilt/react/tools';

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  const routes = useRoutes([
    {match: 'one', render: <One />},
    {match: 'two', render: <Two />},
  ]);

  return <Container>{routes}</Container>;
}

// This component renders a scrollable element to contain the app, so we attach
// the scrollable ref to our element. This prevents the default behavior of
// scrolling the HTML element, which would not do anything in this case.
function Container({children}: PropsWithChildren) {
  const scrollableRef = useRouteChangeScrollRestoration();

  return (
    <div style={{height: '100vh', overflow: 'auto'}} ref={scrollableRef}>
      {children}
    </div>
  );
}

function One() {
  return <div>Page one!</div>;
}

function Two() {
  return <div>Page two!</div>;
}
```

For scroll restoration to work well, you need to have all the same UI rendered when you return to a route as you did the last time you were there. Sometimes, you may not be able to do this — the data used to render that page may have been uncacheable, or you may have taken some action on subsequent pages that invalidated the content of earlier ones. In these cases, you may need to prevent scroll restoration for some route changes, and potentially restore the scroll position manually at another time (if you can do so without causing a jank-filled experience for users!).

The `useRouteChangeScrollRestoration()` hook supports implementing this kind of “delayed” scroll restoration. You can pass an `ready: false` option to this hook to indicate that scroll restoration should be delayed. When you set the `ready` option to anything but `false`, any delayed scroll restoration will be applied to the page.

```tsx
import {
  Link,
  Routing,
  useRouteChangeScrollRestoration,
} from '@quilted/quilt/navigate';

const routes = [
  {match: '/', render: <Start />},
  {match: 'payments', render: <Payments />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <Link to="payments">View payments</Link>;
}

function Payments() {
  const {data, loading} = useUncacheableData();

  useRouteChangeScrollRestoration({ready: !loading});

  return <div>Data: {data}</div>;
}
```

The `useRouteChangeScrollRestoration()` hook also allows you to register additional elements on the page whose scroll positions should independently measured and restored when the route changes. Pass a string as the first argument to `useRouteChangeScrollRestoration()`, and that string will be used as a unique identifier for your custom scroll area. You’ll need to use the resulting ref to specify the custom scrollable element — Quilt will only use the HTML element as the default for the “main” scroll restoration.

```tsx
import {
  Routing,
  useRoutes,
  useRouteChangeScrollRestoration,
} from '@quilted/quilt/navigate';
import type {PropsWithChildren} from '@quilted/quilt/react/tools';

function App() {
  return (
    <Routing>
      <Routes />
    </Routing>
  );
}

function Routes() {
  const routes = useRoutes([
    {match: 'one', render: <One />},
    {match: 'two', render: <Two />},
  ]);

  return <Container>{routes}</Container>;
}

function Container({children}: PropsWithChildren) {
  const sidePanelScrollRef = useRouteChangeScrollRestoration('SidePanel');

  return (
    <div className="Container">
      <div>{children}</div>
      <div className="SidePanel" ref={sideScroll}>
        A scrollable side panel goes here
      </div>
    </div>
  );
}

function One() {
  return <div>Page one!</div>;
}

function Two() {
  return <div>Page two!</div>;
}
```

You can customize if and when scroll restoration happens for custom scroll areas by passing the same `active: false` option discussed earlier in this section, but as the second argument, after the string identifier.

### Focus management

When a browser performs its standard full-page navigation, it puts focus back on the outermost HTML element of the new page. This ensures that screen reader users are aware that the content of the page has changed, and aren’t forced to navigate their focus back to the main content area before proceeding.

Quilt’s router defaults to recreating this behavior — after a route change, Quilt will put focus back at the start of the page. This is an OK default, but if your application has a significant amount of UI that is common across pages, you will be forcing screen reader and keyboard users to move through a lot of content on every navigation.

You might want to consider adding a [“skip navigation” link](https://webaim.org/techniques/skipnav/) to improve this experience, but you can also tell Quilt to put focus on a more appropriate element after navigation. Quilt provides a `useRouteChangeFocus()` hook that returns a React `ref`. You can attach that `ref` to any DOM node you want to put focus on when the active route changes.

```tsx
import {Routing, useRouteChangeFocus, useRoutes} from '@quilted/quilt/navigate';
import type {PropsWithChildren} from '@quilted/quilt/react/tools';

function App() {
  return (
    <Routing>
      <Frame>
        <Routes />
      </Frame>
    </Routing>
  );
}

function Frame({children}: PropsWithChildren) {
  const routeChangeFocusRef = useRouteChangeFocus();

  return (
    <div>
      <nav>Navigation will go here</nav>
      <main ref={routeChangeFocusRef}>{children}</main>
    </div>
  );
}

function Routes() {
  return useRoutes([
    {match: '/', render: <Start />},
    {match: 'account', render: <Account />},
  ]);
}

function Start() {
  return <div>Let’s get started!</div>;
}

function Account() {
  return <div>Your account details will be here.</div>;
}
```

Make sure you test the behavior of your application for screen readers when using this API! Moving focus incorrectly can have a very disorienting effect. If you use this API, we recommend placing the focus on a wrapper element that contains the parts of the app that change on navigation (as shown in the previous example), or placing it on a [heading that represents the new route contents](https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/).

### Navigation blocking

Applications sometimes need to block the user from being able to navigate away. While it is generally better to save the state of the page and “rehydrate” it when the user returns, this is not always possible. For these cases, Quilt allows you to block all navigation using the `useNavigationBlock()` hook.

You pass this hook a function that will be called for any navigation that is attempted (either through clicking on a `Link`, calling the router’s `navigate()` method, or pressing the browser back/ forward buttons). This function should return `true` if you want to prevent navigation, and false otherwise.

The function you pass to `useNavigationBlock()` is called with an object containing a `targetUrl` property, which is an `EnhancedURL` object representing the target destination, and a `currentUrl` property that indicates the active route in your application. You can use these fields to conditionally block only for some destinations:

```tsx
import {useState} from 'react';
import {Routing, useNavigationBlock} from '@quilted/quilt/navigate';
import {TextField} from 'some-ui-library';

const routes = [
  {match: '/', render: <Start />},
  {match: 'edit', render: <Edit />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <div>Let’s get started!</div>;
}

function Edit() {
  const [value, setValue] = useState('');

  useNavigationBlock(({targetUrl, allow}) => {
    // Allow navigation if there is no value yet
    if (!value) return false;

    // Allow navigation to a sign-out page to proceed normally.
    if (targetUrl.pathname.startsWith('/sign-out')) return false;

    return true;
  });

  return <TextField label="Display name" value={value} onChange={setValue} />;
}
```

The `useNavigationBlock()` hook returns an object with details about the block. This object has a `blocked` field, which is a [`Signal`](./TODO) object containing a boolean value, indicating whether the blocker is currently active. It also has an `unblock` method that, when called, will unblock the currently-blocked navigation.

These details are especially useful when using a simplified version of the `useNavigationBlock()` hook, where you provide a boolean argument indicating whether the navigation block is active (or omit the function argument entirely, in which case it defaults to `true`). You can block all navigations conditionally, and use the `blocked` and `unblock` properties to render your own UI

```tsx
import {useState} from 'react';
import {Routing, useNavigationBlock} from '@quilted/quilt/navigate';
import {TextField, Dialog} from 'my-ui-library';

const routes = [
  {match: '/', render: <Start />},
  {match: 'edit', render: <Edit />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  return <div>Let’s get started!</div>;
}

function Edit() {
  const [value, setValue] = useState('');
  const {blocked, unblock} = useNavigationBlock(value !== '');

  return (
    <>
      <TextField label="Display name" value={value} onChange={setValue} />
      <Dialog open={blocked.value} onAccept={unblock}>
        Are you sure you want to leave?
      </Dialog>
    </>
  );
}
```

A common case when blocking navigation is to block while a promise runs, and to allow progress when that promise finishes. If the function you pass to `useNavigationBlock()` returns a promise, the router will wait for it to resolve and proceed with the navigation automatically. That means you don’t need to call the `unblock()` function manually, like we did in the previous example.

The example below shows how you can use this feature of the router to preload content for a route before committing the navigation. Note that a more powerful version of this feature is integrated directly into the router ([route-based preloading](#route-based-preloading)), so you would generally only use this more manual form of preloading if you have some state you need to preload the component correctly that is not available when defining your routes.

```tsx
import {
  Routing,
  Link,
  usePreload,
  useNavigationBlock,
} from '@quilted/quilt/navigate';
import {createAsyncComponent} from '@quilted/quilt/async';

const BigRoute = createAsyncComponent(() => import('./Big.tsx'));

const routes = [
  {match: '/', render: <Start />},
  {match: 'big', render: <BigRoute />},
];

function App() {
  return <Routing routes={routes} />;
}

function Start() {
  useNavigationBlock(async ({targetUrl}) => {
    // When we are going to the /big route, we will preload
    if (targetUrl.pathname !== '/big') return;

    // Components created with `createAsyncComponent()` have a `load()` method
    // that will load the assets for this component, and return a promise that
    // resolves once the component is ready to be rendered.
    await BigRoute.load();
  });

  return <Link to="/big">Go to the route with a big bundle size</Link>;
}
```

# `@quilted/react-html`

This library provides components and hooks for interacting with the HTML document. For a full overview of Quilt’s support for HTML, you can read the [HTML guide](../../documentation/features/html.md).

## Getting the library

> **Note:** `@quilted/quilt/html` re-exports the hooks and components from this library, and automatically applies the results during server-side rendering. If you already have `@quilted/quilt`, you don’t need to install this library.

Install this library as a dependency by running the following command:

```zsh
yarn add @quilted/react-html
```

## Using the library

### Configuring server-side rendering

This library lets you interact with HTML from within a React app. This can be useful for an app that is only rendered on the client, but it’s great when paired with server-side rendering. To include the attributes and elements your app declares in your HTML response, you’ll need to do a bit of work to configure server-side rendering.

> **Note:** if you are using Quilt’s [automatic server-side rendering feature](../../documentation/features/server-rendering.md), this work is already done for you. You can skip on to the next sections, where you’ll learn how to manipulate the HTML document from your React app.

TODO

### Configuring client-side updates

> **Note:** if you are using Quilt’s [`App` component](TODO), this work is already done for you. You can skip on to the next sections, where you’ll learn how to manipulate the HTML document from your React app.

A number of components and hooks from this library, including `<Title />`, `<Meta />`, and `<Link />`, can update the HTML document client-side. These components rely on a central batching mechanism to coordinate their changes to the DOM. To kick off those batch updates, you need to call the `useHTMLUpdater()` hook from this library somewhere in your application:

```tsx
import {useHTMLUpdater} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App({user}: {user: string}) {
  useHTMLUpdater();

  return <Ui />;
}
```

### Adding content to the `<head>`

You often need to add elements to the `<head>` of your page. Many aspects of the browser’s behavior can be influenced through `<meta>` tags, and metadata for search engine optimization (SEO) are commonly placed in this part of the document. Quilt provides a collection of hooks and components that you can use in any component of your app to add these special tags.

#### `<title />`

To add a custom [document title](https://developer.mozilla.org/en-US/docs/Web/API/Document/title), you can use the `useTitle` hook, or the `Title` component:

```tsx
import {useTitle, Title} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App({user}: {user: string}) {
  useTitle(`Welcome, ${user}!`);

  // or...

  return <Title>Welcome, {user}!</Title>;
}
```

#### `<meta />`

To add additional [`<meta>` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) to the `<head>`, you can use the `useMeta` hook, or the `Meta` component:

```tsx
import {useMeta, Meta} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useMeta({name: 'description', content: 'An app for doing fun stuff!'});

  // or...

  return <Meta name="description" content="An app for doing fun stuff!" />;
}
```

Quilt also comes with a few components that provide more tailored APIs for common `<meta>` tags. The `useViewport` hook (or the `Viewport` component) can be used to set the [viewport `<meta>` tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag), and the `useThemeColor` hook (or the `ThemeColor` component) can be used to set the [`theme-color` `<meta>` tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color):

```tsx
import {
  useViewport,
  useThemeColor,
  Viewport,
  ThemeColor,
} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useViewport({cover: true});
  useThemeColor('#BADA55');

  // or...

  return (
    <>
      <Viewport cover />
      <ThemeColor value="#BADA55" />
    </>
  );
}
```

The `useSearchRobots` hook and `SearchRobots` component can be used to set the [`robots` `<meta>` tag](https://developers.google.com/search/docs/advanced/robots/robots_meta_tag)

```tsx
import {useSearchRobots, SearchRobots} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useSearchRobots({
    translate: false,
    snippet: {maxLength: 20},
    imagePreviews: {maxSize: 'large'},
  });

  // or...

  return (
    <SearchRobots
      translate={false}
      snippet={{maxLength: 20}}
      imagePreviews={{maxSize: 'large'}}
    />
  );
}
```

#### `<link />`

To add additional [`<link>` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) to the `<head>`, you can use the `useLink` hook, or the `Link` component:

```tsx
import {useLink, Link} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useLink({
    rel: 'apple-touch-icon-precomposed',
    href: 'apple-icon-114.png',
    sizes: '114x114',
    type: 'image/png',
  });

  // or...

  return (
    <Link
      rel="apple-touch-icon-precomposed"
      href="apple-icon-114.png"
      sizes="114x114"
      type="image/png"
    />
  );
}
```

Like with `<meta>` tags, Quilt provides a convenience components for interacting with common uses of `<link>` tags. You can use the `useFavicon` hook (or `Favicon` component) to set the [favicon](https://developer.mozilla.org/en-US/docs/Glossary/Favicon):

```tsx
import {useFavicon, Favicon} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useFavicon('https://fav.farm/💩');

  // or...

  return <Favicon source="https://fav.farm/💩" />;
}
```

The `Favicon` component comes with a few useful shortcuts for special options:

```tsx
import {Favicon} from '@quilted/react-html';

export function BlankFavicon() {
  // Provides a completely empty image, which prevents browsers from trying
  // to make a request to your backend for a favicon.
  return <Favicon blank />;
}

export function EmojiFavicon() {
  // Uses the emoji as a favicon by providing it as an inline SVG image.
  // Hat tip to Lea Verou! https://twitter.com/LeaVerou/status/1241619866475474946
  return <Favicon emoji="🌈" />;
}
```

If you use either of these special props, you **must** include the `data:` source in your [content security policy’s `img-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/img-src), as these props use an inline image provided as a data URI.

You can use the `useAlternateUrl` hook or the `Alternate` component in order to specify an alternate URL for this page. You can pass `canonical: true` for these declarations to indicate that this is the [canonical URL of the page](https://developers.google.com/search/docs/advanced/crawling/consolidate-duplicate-urls), or you can pass the `locale` of the alternate page as a string to create a mapping between [the same content in multiple languages](https://developers.google.com/search/docs/advanced/crawling/localized-versions).

```tsx
import {useAlternateUrl, Alternate} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  // When specifying locale alternates, make sure to also specify
  // this page’s locale!

  useAlternateUrl('https://en.my-site.com', {locale: 'en'});
  useAlternateUrl('https://fr.my-site.com', {locale: 'fr'});

  // or...

  return (
    <>
      <Alternate url="https://en.my-site.com" locale="en" />
      <Alternate url="https://fr.my-site.com" locale="fr" />
    </>
  );
}
```

### Setting attributes on elements outside your React application

Some libraries require you to put attributes on “special” elements in the DOM, most commonly either on the root `<html>` element, or the `<body>` element. Quilt provides an `<HTMLAttributes>` component and `useHTMLAttributes` hook for applying props to the `<html>` element from within your React app, and `<BodyAttributes>`/ `useBodyAttributes` for applying props to the `<body>` element:

```tsx
import {
  BodyAttributes,
  HTMLAttributes,
  useBodyAttributes,
  useHTMLAttributes,
} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useHTMLAttributes({lang: 'en'});
  useBodyAttributes({'data-page': 'my-page'});

  // or...

  return (
    <>
      <HTMLAttributes lang="en" />
      <BodyAttributes data-page="my-page" />
    </>
  );
}
```

### Serializing data from the server to the browser

A common need in web applications is to reference some data that exists on the server. This could be data loaded from a database, or retrieved with a network call. However it is fetched, you typically use that data to impact the content you render — for example, to render a list of products fetched from a GraphQL API. If you want to render that content on the server, and then have it render on the client as well, the data will need to be sent from the server to the client.

Quilt provides a solution to this problem that works for web applications by rendering the data into your HTML document in a process we refer to as “serialization”. Specifically, Quilt places the data you need in `<meta>` tags in the head of the document, serializing the data as JSON.

To make use of this serialization system, you must first set up [server-side rendering](#configuring-server-side-rendering) for this library. Once this is in place, you can use the `useSerialized()` hook to reference values on the server that will be serialized for access on the client.

This hook takes two arguments. The first argument is a string, which acts as a unique identifier for this serialized data. Quilt uses this identifier to connect the data you retrieve on the server to the data that is serialized for the client.

The second argument can be one of the following:

- A serializable value (basically, anything that can be converted to JSON). When you pass a serializable value directly, it is used as the return result of the hook on the server, serialized to the client, and used as the return value of the hook on the client, too.
- A function that returns a serializable value. This function will be run as a [deferred server action](./TODO), which means that it will run after server rendering has completed, but before the HTML response is sent to the browser. The result of calling this function is saved as a serialization and will be used as the value on the client, but for server-rendering, the initial return result of this hook is `undefined`, as no value is available yet. This version of the hook is ideal for things like caches, where you may accumulate a collection of data through rendering your app, and you want to make that cache available on the client to “hydrate” the cache.

In either case, the [browser build](../../documentation/features/builds/app/browser.md) will remove the second argument entirely, as it is never used on the client — the serialized data in the HTML is used in its place.

Let’s take a look at a few concrete examples to understand this serialization technique a little better.

Imagine you had an environment variable that is available only to your server, and you want to use that value to render part of your application. Maybe you deploy your application to different geographies, and the current runtime’s geography is needed to determine the URL to use for some links on the page. Reading from `process.env` (assuming this your application will run in a Node.js environment) will work on the client, but you’ll need `useSerialized` to make that same value available on the client:

```tsx
import {useSerialized} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  const region = useSerialized('region', process.env.DEPLOY_REGION);

  return (
    <a
      href={
        region === 'canada'
          ? 'https://cool-third-party.ca'
          : 'https://cool-third-part.com'
      }
    >
      Visit third-party
    </a>
  );
}
```

Now let’s image we are building an abstraction over `fetch`. We want this abstraction to let us make network requests on the server, and have the results of those requests be available synchronously for the client’s first render. We’ll ignore for a moment how we would perform the actual network requests ([`@quilted/react-server-render`](../react-server-render) would play a crucial role, though!). We’ll assume that we have an object like this one that is provided through context, which acts as a cache for previously-executed queries:

```ts
import {createContext} from 'react';

type Data = any;

export class FetchCache {
  constructor(initialResults?: Record<string, Data>);
  extract(): Record<string, Data>;
}

export const FetchContext = createContext<FetchCache | null>(null);
```

On the server, there will be no initial cache result; those results will be “filled in” by the initial calls made during server-side rendering. We want the `initialResults` fetched by the server to be serialized for the client so that we can construct the cache with that object.

In this case, we’ll use the function form for the second argument of `useSerialized`. This function runs after server rendering is finished, which is required given that we need all the server fetches to be finished before the cache is extracted.

```tsx
import {useMemo} from 'react';
import {useSerialized} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  const serializedCache = useSerialized('fetch', () => fetchCache.extract());
  const fetchCache = useMemo(
    () => new FetchCache(serializedCache),
    [serializedCache],
  );

  return (
    <FetchContext.Provider value={fetchCache}>
      <Ui />
    </FetchContext.Provider>
  );
}
```

If you need to read a serialized value from outside of a React context, you can use the `getSerialized` function, which attempts to read serializations directly from the DOM:

```ts
import {getSerialized} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

const fetchCache = getSerialized('fetch');
doSomethingWithFetchCache(fetchCache);
```

### Deferred hydration

Imagine that there is a complex piece of UI that is rendered by your application. Depending on the rest of the contents of the page, this component may or may not be visible in the viewport.

In this situation, we’d ideally like to still server-render the component; if it’s in the initial viewport, we’d like to avoid it rendering after the rest of the content of the page. However, we only want to load the JavaScript for the component when we know for certain it _is_ in the viewport (which we can only determine on the client). If we determine it is in the viewport, we’d like to continue to use the server-rendered markup until the code for that component has loaded.

This pattern is sometimes called “deferred hydration”, and Quilt provides a special `Hydrate` component that allows you to implement the kinds of behavior described above.

This component accepts `children`, which should be the contents you want to defer hydration for.

It also accepts an `id` prop, which is used to identify the hydrated content on the client.

Finally, this component requires you to pass a boolean `render` prop. When `render` is `true`, the contents you passed as `children` are rendered by this component. When it is `false`, the `Hydrator` component will instead attempt to use the HTML for the hydration matching the passed `id`.

A basic implementation of the “only load the component when it is in the viewport” behavior described above would look like this:

```tsx
import {Hydrator} from '@quilted/react-html';

function MyAsyncComponent() {
  // We are ignoring how we would synchronously load the component
  // on the server — assume this hook will return a defined `Component`
  // on the server, but will initially not return it on the client.
  const [Component, load] = useMaybeAsyncComponent();

  return (
    <WhenInViewport perform={load}>
      <Hydrator id="MyAsyncComponent" render={Component != null}>
        {Component ? <Component /> : null}
      </Hydrator>
    </WhenInViewport>
  );
}
```

The example above is ignoring how `Component` could be loaded synchronously on the server (which is needed so that the initial HTML payload includes its rendered output), and does not address some of the trickier parts of deferred hydration (like ensuring that styles are referenced in the HTML, even if the JavaScript will be loaded asynchronously). Quilt provides a powerful [async component library](../react-async) that implements the deferred hydration pattern without you needing to worry about these complexities. The `createAsyncComponent()` function from that library uses `Hydrator` under the hood, so you probably don’t ever need to use `Hydrator` directly.

### Testing

TODO

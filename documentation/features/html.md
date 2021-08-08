# Interacting with the HTML document in Quilt apps

Browsers and search engines expose many powerful capabilities to websites through special HTML elements and attributes:

- You can update the contents of the browser’s tab for your page using the [`<title>`](https://developer.mozilla.org/en-US/docs/Web/API/Document/title) and [`<link rel="icon">`](https://developer.mozilla.org/en-US/docs/Glossary/Favicon) elements
- You can control the way search engines index your pages using the [`robots` `<meta>` tag](https://developers.google.com/search/docs/advanced/robots/robots_meta_tag)
- You can serialize non-HTML content into the HTML document for use on the client (this is often used to send data to the client that is used to start the application on the client)

Quilt provides a collection of [component-friendly APIs](./TODO) for manipulating these special parts of the HTML document, both during client- and [server-side rendering](./server-rendering.md).

## Getting started

This guide assumes you are using the [automatic server-side rendering](./server-rendering.md) provided by Quilt. This powerful feature creates a server runtime that will render your application and collect the “server side effects”, including using the HTML utilities documented in this guide. If you are writing your own custom server-side rendering setup, or are using Quilt in a non-standard way, make sure you follow the guide on [`@quilted/react-html`](../../packages/react-html), which covers how the server-side rendering of the HTML document works under the hood.

This guide also assumes that your application renders the [`<AppContext>` component](./TODO) provided by `@quilted/quilt`, which takes care of updating HTML details on the client.

## Adding content to the `<head>`

You often need to add elements to the `<head>` of your page. Many aspects of the browser’s behavior can be influenced through `<meta>` tags, and metadata for search engine optimization (SEO) are commonly placed in this part of the document. Quilt provides a collection of hooks and components that you can use in any component of your app to add these special tags.

### `<title />`

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

### `<meta />`

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

### `<link />`

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

## Setting attributes on elements outside your React application

Some libraries require you to put attributes on “special” elements in the DOM, most commonly either on the root `<html>` element, or the `<body>` element. Quilt provides an `<HtmlAttributes>` component and `useHtmlAttributes` hook for applying props to the `<html>` element from within your React app, and `<BodyAttributes>`/ `useBodyAttributes` for applying props to the `<body>` element:

```tsx
import {
  BodyAttributes,
  HtmlAttributes,
  useBodyAttributes,
  useHtmlAttributes,
} from '@quilted/react-html';
// also available from '@quilted/quilt/html'

export function App() {
  useHtmlAttributes({lang: 'en'});
  useBodyAttributes({'data-page': 'my-page'});

  // or...

  return (
    <>
      <HtmlAttributes lang="en" />
      <BodyAttributes data-page="my-page" />
    </>
  );
}
```

## Serializing data from the server to the browser

A common need in web applications is to reference some data that exists on the server. This could be data loaded from a database, or retrieved with a network call. However it is fetched, you typically use that data to impact the content you render — for example, to render a list of products fetched from a GraphQL API. If you want to render that content on the server, and then have it render on the client as well, the data will need to be sent from the server to the client.

Quilt provides a solution to this problem that works for web applications by rendering the data into your HTML document in a process we refer to as “serialization”. Specifically, Quilt places the data you need in `<meta>` tags in the head of the document, serializing the data as JSON.

The [`@quilted/react-html`](../../packages/react-html#serializing-data-from-the-server-to-the-browser) documentation outlines how to use the `useSerialized()` hook, which Quilt provides for implementing server-to-client serialization. Quilt uses this hook internally for serializing [GraphQL results](./graphql.md) and [HTTP headers](./http.md#reading-cookies-and-other-request-headers), so you may not need to use it yourself, but it’s nice to have it there for complex applications using Quilt!

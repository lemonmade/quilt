# Interacting with HTTP in Quilt apps

In web applications, it’s fairly common to need to interact with HTTP primitives:

- You may want to set a custom HTTP status code on your HTML response, like a `404` code to represent a page where no resource was found.
- You’ll often need to read from HTTP headers — especially the `Cookie` header, which gives you the cookies for this user — in order to authenticate or customize the application.
- You may want to set additional HTTP headers on the HTML response, like a [`Content-Security-Policy` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) to control what sources the app can connect to, or a `Location` header to perform an [HTTP redirect](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301).

Quilt strongly encourages [server rendering your application](./server-rendering.md), so we want to make sure you have access to all these features of HTTP. Because Quilt is a [component-focused framework](./TODO), though, we put a component-friendly spin on these concepts. You can read HTTP details using hooks, and you can write them with hooks or components. This guide covers the prerequisites and limitations of these features, and how to use them in your application.

## Getting started

This guide assumes you are using the [automatic server-side rendering](./server-rendering.md) provided by Quilt. This powerful feature creates a server runtime that will render your application and collect the “server side effects”, including using the HTTP utilities documented in this guide. If you are writing your own custom server-side rendering setup, or are using Quilt in a non-standard way, make sure you follow the guide on [`@quilted/react-http`](../../packages/react-http), which covers how the server-side rendering of HTTP details works under the hood.

## Performing HTTP redirects

> **Note:** In general, we recommend implementing redirects somewhere earlier in the network stack, before your application is rendered at all. While Quilt has good support for redirects, rendering your application is a slow way to discover a redirect. We only recommend using the features described below when the redirects are tied to the data you fetch for the rest of your application.

If you want to perform a redirect from one route in your application to another, return the `Redirect` component:

```tsx
import {Redirect} from '@quilted/quilt';

function MyComponent({shouldRedirect = false} = {}) {
  if (shouldRedirect) {
    return <Redirect to="/" />;
  }

  return <Ui />;
}
```

When you perform a redirect, Quilt will bail out of its server rendering process, set a `302` status code, and set the `Location` header to the URL resolved from the `to` prop. When a `Redirect` is rendered on the client, it will perform a navigation with the router, replacing the current page in the history stack.

The `to` prop on `Redirect` works the same way as the [`Link` component](./routing.md). It can be an absolute path, which will be relative to the root of your app; a relative path (without a leading `/`), which will be relative to the current URL; a `URL` object; an object with optional `path`, `search`, and `hash` keys; or a function that takes the current URL, and returns any of the above.

All of these redirects in the next example would go to `/redirected`:

```tsx
import {useRoutes, Redirect} from '@quilted/quilt';

export function App() {
  return useRoutes([
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
    {match: 'redirected', render: () => <div>Redirected!</div>},
  ]);
}
```

As a convenience, if you are just redirecting one route to another, you can use the route’s `redirect` key instead of rendering a `Redirect` component:

```tsx
import {useRoutes, Redirect} from '@quilted/quilt';

export function App() {
  return useRoutes([
    {
      match: '/',
      redirect: '/redirected',
      // or redirect: 'redirected',
      // or redirect: new URL('redirected', url),
      // or redirect: {path: '/redirected'},
      // or redirect: (currentUrl) => new URL('/redirected', currentUrl),
    },
    {match: 'redirected', render: () => <div>Redirected!</div>},
  ]);
}
```

When you render a `Redirect` component, you can choose a status code other than the default `302` by passing a `statusCode` prop:

```tsx
import {Redirect} from '@quilted/quilt';

function MyComponent({shouldRedirect = false} = {}) {
  if (shouldRedirect) {
    return <Redirect to="/" statusCode={301} />;
  }

  return <Ui />;
}
```

## Setting a status code on the response

You can set the status code on the response using the `useResponseStatus` hook, or the `ResponseStatus` component:

```tsx
import {useResponseStatus, ResponseStatus} from '@quilted/quilt/http';

export function NotFoundUi() {
  useResponseStatus(404);

  // or...

  return <ResponseStatus code={404} />;
}
```

Because setting a `404` status code is fairly common, there is a dedicated `NotFound` component that is equivalent to the example above:

```tsx
import {NotFound} from '@quilted/quilt/http';

export function NotFoundUi() {
  return <NotFound />;
}
```

## Reading cookies and other request headers

You can read cookies using the `useCookie` hook:

```tsx
import {useCookie, Redirect} from '@quilted/quilt';
import type {PropsWithChildren} from '@quilted/quilt';

export function GuardWithAuth({children}: PropsWithChildren) {
  const authCookie = useCookie('Auth');

  if (authCookie == null) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
```

On the server, these cookies are parsed from the `Cookie` request header. On the client, these cookies are parsed from `document.cookie`.

If you want to read other request headers, you can use the `useRequestHeader` hook:

```tsx
import {useRequestHeader} from '@quilted/quilt/http';

export function CheckForBrotli() {
  // Don’t worry, headers are normalized, so any capitalization works!
  const acceptEncoding = useRequestHeader('Accept-Encoding') ?? '';

  return acceptEncoding.includes('br') ? (
    <div>Request supports brotli!</div>
  ) : (
    <div>Request does not support brotli :(</div>
  );
}
```

Typically, request headers are only available on the server-side. When you read them using the `useRequestHeader` hooks, though, they are serialized into the HTML document so that they are also available on the client. **Make sure that you are comfortable exposing this header to the client before using the `useRequestHeader` hook.**

## Setting cookies and other response headers

You can set an HTTP cookie by using the `useResponseCookie` hook or `ResponseCookie` component. Both accept the cookie name, value, and [other cookie options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies).

```tsx
import {useResponseCookie, ResponseCookie} from '@quilted/quilt/http';

export function StoreCurrentUser({user}: {user: string}) {
  useResponseCookie('user', user, {path: '/profile'});

  // or...

  return <ResponseCookie name="user" value={user} path="/profile" />;
}
```

Similarly, if you want to set other response headers, you can use the `ResponseHeader` component or `useResponseHeader` hook:

```tsx
import {useResponseHeader, ResponseHeader} from '@quilted/quilt/http';

export function Http() {
  // FLoC off, Google.
  // @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea

  useResponseHeader('Permissions-Policy', 'interest-cohort=()');

  // or...

  return (
    <ResponseHeader name="Permissions-Policy" value="interest-cohort=()" />
  );
}
```

This library also provides dedicated components and hooks for a few common HTTP headers:

- [`Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) with `useCacheControl` or `<CacheControl />`
- [`Content-Security-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) with `useContentSecurityPolicy` or `<ContentSecurityPolicy />`
- [`Cross-Origin-Embedder-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy) with `useCrossOriginEmbedderPolicy` or `<CrossOriginEmbedderPolicy />`
- [`Cross-Origin-Opener-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy) with `useCrossOriginOpenerPolicy` or `<CrossOriginOpenerPolicy />`
- [`Cross-Origin-Resource-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy) with `useCrossOriginResourcePolicy` or `<CrossOriginResourcePolicy />`
- [`Permissions-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy) with `usePermissionsPolicy` or `<PermissionsPolicy />`
- [`Strict-Transport-Security`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) with `useStrictTransportSecurity` or `<StrictTransportSecurity />`

```tsx
import {
  useCacheControl,
  useContentSecurityPolicy,
  useCrossOriginEmbedderPolicy,
  useCrossOriginOpenerPolicy,
  useCrossOriginResourcePolicy,
  usePermissionsPolicy,
  useStrictTransportSecurity,
  CacheControl,
  ContentSecurityPolicy,
  CrossOriginEmbedderPolicy,
  CrossOriginOpenerPolicy,
  CrossOriginResourcePolicy,
  PermissionsPolicy,
  StrictTransportSecurity,
} from '@quilted/quilt/http';

export function Http() {
  useCacheControl({maxAge: 60, revalidate: true});
  useContentSecurityPolicy({
    defaultSources: ["'self'"],
    frameAncestors: false,
    upgradeInsecureRequests: true,
  });
  useCrossOriginEmbedderPolicy('require-corp');
  useCrossOriginOpenerPolicy('same-origin');
  useCrossOriginResourcePolicy('same-origin');
  usePermissionsPolicy({interestCohort: false, geolocation: false});
  useStrictTransportSecurity();

  // or...

  return (
    <>
      <CacheControl maxAge={60} revalidate />
      <ContentSecurityPolicy
        defaultSources={["'self'"]}
        frameAncestors={false}
        upgradeInsecureRequests
      />
      <CrossOriginEmbedderPolicy value="require-corp" />
      <CrossOriginOpenerPolicy value="same-origin" />
      <CrossOriginResourcePolicy value="same-origin" />
      <PermissionsPolicy interestCohort={false} geolocation={false} />
      <StrictTransportSecurity />
    </>
  );
}
```

When using Quilt’s builds, all header-related components and hooks are entirely removed from the client-side bundle, because they do nothing there.

If you want to set cookies imperatively on the client-side, you can use the `useCookies` hook to get a reference to the cookie store in the browser, and use its `set` method to update the cookie on the client.

```tsx
import {useCookies} from '@quilted/quilt';

export function SwitchUser({users}: {users: string[]}) {
  const cookies = useCookies();

  return (
    <SelectButton
      options={users}
      onSelect={(user) => {
        cookies.set('user', user, {path: '/profile'});
      }}
    >
      Change user
    </SelectButton>
  );
}
```

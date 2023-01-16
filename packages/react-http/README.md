# `@quilted/react-http`

This library provides components and hooks for interacting with HTTP primitives. For a full overview of Quilt’s support for dealing with HTTP, you can read the [HTTP guide](../../documentation/features/http.md).

## Getting the library

> **Note:** `@quilted/quilt/http` re-exports the hooks and components from this library, and automatically applies the results during server-side rendering. If you already have `@quilted/quilt`, you don’t need to install this library.

Install this library as a dependency by running the following command:

```zsh
yarn add @quilted/react-http
```

## Using the library

### Configuring server-side rendering

This library can work entirely on the client-side, but if you are interested in updating the HTML document from your app, you usually also want server-side rendering.

> **Note:** if you are using Quilt’s [automatic server-side rendering feature](../../documentation/features/server-rendering.md), this work is already done for you. You can skip on to the next sections, where you’ll learn how to update the HTML document from your application.

TODO

### Reading HTTP-related values

You can read cookies using the `useCookie` hook:

```tsx
import {useCookie} from '@quilted/react-http';
// Also available from '@quilted/quilt'

export function MyComponent() {
  const userCookie = useCookie('user');

  return userCookie ? (
    <div>No user signed in!</div>
  ) : (
    <div>{userCookie} signed in!</div>
  );
}
```

On the server, these cookies are parsed from the `Cookie` request header. On the client, these cookies are parsed from `document.cookie`.

If you want to read other request headers, you can use the `useRequestHeader` hook:

```tsx
import {useRequestHeader} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

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

Note that, for this feature to work, you must also be using [`@quilted/react-html`’s server-side rendering feature](./TODO).

### Writing HTTP-related values

You can set the status code on the response using the `useResponseStatus` hook, or the `ResponseStatus` component:

```tsx
import {useResponseStatus, ResponseStatus} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

export function NotFoundUi() {
  useResponseStatus(404);

  // or...

  return <ResponseStatus code={404} />;
}
```

Because setting a `404` status code is fairly common, there is a dedicated `NotFound` component that is equivalent to the example above:

```tsx
import {NotFound} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

export function NotFoundUi() {
  return <NotFound />;
}
```

If you want to perform an HTTP redirect, you can use the `Redirect` component:

```tsx
import {Redirect} from '@quilted/react-http';

function MyComponent({shouldRedirect = false} = {}) {
  if (shouldRedirect) {
    return <Redirect to="/" />;
  }

  return <Ui />;
}
```

When you perform a redirect, Quilt will bail out of its server rendering process, set a `302` status code, and set the `Location` header to the URL resolved from the `to` prop. If you want to perform a redirect on both the server and client, you should use the `Redirect` component from [`@quilted/react-router`](../react-router) instead.

You can set an HTTP cookie by using the `useResponseCookie` hook or `ResponseCookie` component. Both accept the cookie name, value, and [other cookie options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies).

```tsx
import {useResponseCookie, ResponseCookie} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

export function StoreCurrentUser({user}: {user: string}) {
  useResponseCookie('user', user, {path: '/profile'});

  // or...

  return <ResponseCookie name="user" value={user} path="/profile" />;
}
```

Similarly, if you want to set other response headers, you can use the `ResponseHeader` component or `useResponseHeader` hook:

```tsx
import {useResponseHeader, ResponseHeader} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

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
} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

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

If you want to set cookies imperatively on the client-side, you can use the `useCookies` hook to get a reference to the cookie store in the browser, and use its `set` method to update the cookie on the client.

```tsx
import {useCookies} from '@quilted/react-http';
// also available from '@quilted/quilt'

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

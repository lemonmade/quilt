# `@quilted/react-http`

Provides components and hooks for interacting with HTTP primitives. For a full overview of Quilt’s support for dealing with HTTP, you can read the [HTTP guide](../../documentation/features/http.md).

## Getting the library

> **Note:** `@quilted/quilt/http` re-exports the hooks and components from this library, and automatically applies the results during server-side rendering. If you already have `@quilted/quilt`, you don’t need to install this library.

Install this library as a dependency by running the following command:

```zsh
yarn install @quilted/react-http
```

## Using the library

### Configuring server-side rendering

This library lets you interact with HTTP from within a React app, so for it to do anything useful, you need to configure server-side rendering first.

> **Note:** if you are using Quilt’s [automatic server-side rendering feature](../../documentation/features/server-rendering.md), this work is already done for you. You can skip on to the next sections, where you’ll learn how to read and write HTTP values from your React app.

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

This library also provides dedicated components and hooks for two common HTTP headers: the [`Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) and [`Content-Security-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) headers.

```tsx
import {
  useCacheControl,
  useContentSecurityPolicy,
  CacheControl,
  ContentSecurityPolicy,
} from '@quilted/react-http';
// also available from '@quilted/quilt/http'

export function Http() {
  useCacheControl({maxAge: 60, revalidate: true});
  useContentSecurityPolicy({
    defaultSources: ["'self'"],
    upgradeInsecureRequests: true,
  });

  // or...

  return (
    <>
      <CacheControl maxAge={60} revalidate />
      <ContentSecurityPolicy
        defaultSources={["'self'"]}
        upgradeInsecureRequests
      />
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

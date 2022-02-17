# `@quilted/http`

This library provides a collection of HTTP-related types and utilities.

## Getting the library

> **Note:** `@quilted/quilt/http` and `@quilted/react-http` re-export all of the types from this library. If you already have either `@quilted/quilt` or `@quilted/react-http`, you can use the exports from those libraries instead of `@quilted/http`.

Install this library as a dependency by running the following command:

```zsh
yarn add @quilted/http
```

## Using the library

This library provides the following helper types, which each represent some aspect of interacting with HTTP:

- `HttpMethod`, an enum representing [the allowed HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
- `StatusCode`, an enum representing the [standard response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- `ResponseType`, an enum representing the [standard response status code classes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- `Headers` and `ReadonlyHeaders`, which are aliases to the native `Headers` type.
- `Cookies`, `ReadonlyCookies`, and `CookieOptions`, a set of interfaces that provide an isomorphic pattern for getting and setting [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- `ContentSecurityPolicyDirective`, `ContentSecurityPolicySandboxAllow`, and `ContentSecurityPolicySpecialSource`, enums that provide friendly names for creating a [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- `PermissionsPolicyDirective` and `PermissionsPolicySpecialSource`, enums that provide friendly names for creating a [permissions policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy)

This library also provides the following helper functions that allow you to represent HTTP-related constructs:

- `createHeaders()` creates a `Headers`-compatible object, even in environments where the `Headers` global does not exist.

### Using this library as types

Many of the types in this library are provided as enums. Enums are convenient for developers, because they let you avoid having plain strings or numbers all over the codebase; that is, many developers prefer:

```ts
import {StatusCode} from '@quilted/http';

const statusCode = StatusCode.NotFound;
```

Over:

```ts
const statusCode = 404;
```

While enums are convenient, they have a runtime cost, because the whole enum is included in the output bundles even if only a single enum value is used. For this reason, we recommend any library that uses `@quilted/http` use type imports to reference the enums in this package:

```ts
import type {StatusCode} from '@quilted/http';
// instead of
// import {StatusCode} from '@quilted/http';

export function myFunctionThatUsesStatusCode(code: StatusCode) {}
```

This allows consumers of your library to get type safety on the allowed values, but without forcing consumers to include the entire enum in their bundle if they’d prefer to use these types exclusively as types.

```ts
import {StatusCode} from '@quilted/http';

// Works when using the enum...
myFunctionThatUsesStatusCode(StatusCode.NotFound);

// And when using static values:
myFunctionThatUsesStatusCode(404);
```

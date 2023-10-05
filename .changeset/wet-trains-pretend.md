---
'@quilted/graphql': major
'@quilted/quilt': patch
'@quilted/react-graphql': patch
---

Simplify `GraphQLFetch` type and separate HTTP options

The `GraphQLFetch` and `GraphQLStreamingFetch` types previous had the assumption of an HTTP transport baked into their options. This made it awkward to use in other contexts, like a directly-callable function.

To fix this issue, we’ve simplified the `GraphQLFetch` and `GraphQLStreamingFetch` types so that they only accept options universal to all transports: `variables`, for the operation variables, and `signal`, for an optional `AbortSignal` that should cancel the request. The previous HTTP-specific options have been moved to new `GraphQLFetchOverHTTPOptions` and `GraphQLStreamingFetchOverHTTPOptions` types. The `GraphQLFetch` function was also made a little more strict (requiring it to return a `Promise` for a GraphQL result).

Additionally, the extendable `GraphQLFetchContext` type has been removed from this library. This type could previously be extended to declare additional context that would be optionally available in a GraphQL fetch function:

```ts
import type {GraphQLFetch} from '@quilted/graphql';

// A "module augmentation" that tells TypeScript
// a `user` field is required
declare module '@quilted/graphql' {
  interface GraphQLFetchContext {
    user: {id: string};
  }
}

const fetch: GraphQLFetch = async (operation, {variables}, context) => {
  // `user` is available because of our module augmentation
  const user = context?.user;

  // ... do something with the user and return a result
};

const result = await fetch('query { message }', {}, {user: {id: '123'}});
```

This type was removed in favor of a new `Context` generic on the `GraphQLFetch` and `GraphQLStreamingFetch` types. These allow you to define the types of any additional context you need for your GraphQL fetcher explicitly, without a module augmentation:

```ts
import type {GraphQLFetch} from '@quilted/graphql';

// A "module augmentation" that tells TypeScript
// a `user` field is required
declare module '@quilted/graphql' {
  interface GraphQLFetchContext {
    user: {id: string};
  }
}

const fetch: GraphQLFetch<{
  user: {id: string};
}> = async (operation, {variables}, context) => {
  // `user` is available because of our module augmentation
  const user = context?.user;

  // ... do something with the user and return a result
};

const result = await fetch('query { message }', {}, {user: {id: '123'}});
```

Finally, the `GraphQLVariableOptions` has been simplified. It no longer requires that variables be defined if there are non-nullable variables for the operation. This bit of type safety was very nice, but it was hard to build on top of the `GraphQLVariableOptions` type because of the advanced TypeScript features this type previously used. The new type is a simpler interface that is easy to extend.

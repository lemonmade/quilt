# `@quilted/graphql`

Tiny, type-safe helpers for using GraphQL. This includes helpers for fetching GraphQL queries and mutations, and utilities for testing projects that depend on GraphQL results.

To provide better integration for GraphQL in your build tools, combine this with [`@quilted/graphql-tools`](../graphql-tools/), or use [Quilt as a framework](../../documentation/features/graphql.md).

## Installation

```bash
# npm
npm install @quilted/graphql --save
# pnpm
pnpm install @quilted/graphql --save
# yarn
yarn add @quilted/graphql
```

## Usage

### Fetching GraphQL queries and mutations

GraphQL is only useful if you can fetch results. This library provides a few helpers for fetching GraphQL results over the most common transport: HTTP. These utilities are focused on being as small as possible — basic GraphQL fetches require only about 1Kb of compressed code, and streaming fetches require only about 2Kb.

If you’re getting started with GraphQL, you probably have a GraphQL server being served over HTTP. The [Quilt GraphQL application template](../../documentation/getting-started.md#app-templates), for example, serves its GraphQL endpoint on `/graphql` of the app’s domain. To create a function that lets you fetch data from an HTTP endpoint like this, use the `createGraphQLHttpFetch()` function:

```tsx
import {createGraphQLHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLHttpFetch({url: '/graphql'});
```

The `createGraphQLHttpFetch()` function accepts options to customize the GraphQL request before it is performed. The only required option is `url`, which specifies the URL to send the GraphQL request to. You can also provide `method` and `headers` options to customize the HTTP method and headers, respectively. Each of these options can be a function, which allows you to customize them per-operation:

```tsx
import {createGraphQLHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLHttpFetch({
  url(operation) {
    const url = new URL('/graphql');

    if (operation.name) {
      url.searchParams.set('operationName', operation.name);
    }

    return url;
  },
  headers: {
    'Content-Type': 'application/json+graphql',
  },
});
```

The resulting function can be called with a GraphQL query or mutation, and returns a promise that resolves to the data (or errors) returned by the GraphQL server:

```tsx
import {graphql} from '@quilted/graphql';

// `graphql` is optional, it just provides nice syntax highlighting
// in some editors.
const query = graphql`
  query MyQuery {
    # ...
  }
`;

const {data, errors} = await fetchGraphQL(query);
```

You can also provide `variables` to the fetch function, as well as a `signal` to abort the request:

```tsx
try {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, 1_000);

  const {data, errors} = await fetchGraphQL(query, {
    variables: {name: 'Winston'},
    signal: controller.signal,
  });

  window.clearTimeout(timeout);
} catch (error) {
  // handle abort
}
```

Some GraphQL servers support streaming results for the [`@defer` and `@stream` directives](https://graphql.org/blog/2020-12-08-improving-latency-with-defer-and-stream-directives/). When an operation contains these directives, partial results are streamed to the client as they are available, and must be combined together to form a final result. To create a function that lets you fetch data from an HTTP endpoint like this, use the `createGraphQLStreamingHttpFetch()` function:

```tsx
import {createGraphQLStreamingHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLStreamingHttpFetch({url: '/graphql'});
```

This function accepts the same options as `createGraphQLHttpFetch()`. Instead of returning just a promise for the final result, this function returns an object that is both a promise (resolves when the final result has been received and combined) and an [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols) (yields partial results as they are received):

```tsx
import {graphql} from '@quilted/graphql';

// `graphql` is optional, it just provides nice syntax highlighting
// in some editors.
const query = graphql`
  query MyQuery {
    # ...
  }
`;

for await (const {data, errors, incremental} of fetchGraphQL(query)) {
  // ...
}
```

### Testing GraphQL-dependent code

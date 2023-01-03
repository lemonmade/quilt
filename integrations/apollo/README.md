# `@quilted/apollo`

Integrates [Apollo](https://www.apollographql.com/docs/react) with Quilt by automatically running your GraphQL queries during server-side rendering.

## Installation

Install `@quilted/apollo`, `@apollo/client`, and `graphql` as dependencies of your project:

```bash
$ pnpm add @quilted/apollo @apollo/client graphql --save
```

> **Note:** This library needs [`@quilted/quilt`](../../packages/quilt) installed in your local repository. If you have just [created a new Quilt app](../../documentation/getting-started.md), you already have this installed.

## Usage

[Apollo’s getting started instructions](https://www.apollographql.com/docs/react/get-started) instruct you to create an `ApolloClient` object, and pass it to a `ApolloProvider` component. To integrate Apollo with Quilt, you will pass your `ApolloClient` object to this library’s `ApolloProvider` component instead:

```tsx
import {useMemo} from 'react';
import {useInitialUrl} from '@quilted/quilt';

import {ApolloClient, InMemoryCache} from '@apollo/client';
import {ApolloProvider} from '@quilted/apollo/client';

export default function App() {
  const initialUrl = useInitialUrl();
  const client = useMemo(() => {
    // Replace this with the URL of your actual API. To resolve queries during server-side
    // rendering, this must be an absolute URL.
    const url = new URL('/graphql', initialUrl);

    const cache = new InMemoryCache();

    return new ApolloClient({
      cache,
      uri: url.href,
      // Make sure to enable SSR mode so that Apollo runs the queries during server-side rendering.
      // @see https://www.apollographql.com/docs/react/api/core/ApolloClient/#ssrmode
      ssrMode: true,
    });
  }, []);

  return (
    <ApolloProvider client={client}>
      <Example />
    </ApolloProvider>
  );
}
```

The `ApolloProvider` takes care of ensuring that all queries made by your application are run during server-side rendering. It serializes the results into your HTML payload, and restores that data in the Apollo Client before rendering your app in the browser. It also renders Apollo’s `ApolloProvider` for you, so you don’t need to do it yourself.

That’s all the setup you need! Elsewhere in your application, you can now use Apollo’s [`useQuery` hook](https://www.apollographql.com/docs/react/api/react/hooks#usequery) to load data in your components. The example below shows how you might use Quilt’s GraphQL utilities to perform type-safe GraphQL queries using React Query:

```tsx
import {gql, useQuery} from '@apollo/client';

export function Start() {
  const {data, loading} = useQuery<{hello: string}>(
    gql`
      query {
        hello
      }
    `,
  );

  return loading ? <p>Loading…</p> : <p>{data?.hello ?? 'Server error…'}</p>;
}
```

This library also provides a `parseDocument()` utility function that takes the small build outputs Quilt creates for `.graphql` files, and turns it into a type-safe `TypedDocumentNode` that Apollo needs to run your operations. This allows you to preserve Quilt’s [type-safe GraphQL utilities](../../documentation/features/graphql.md#types) through Apollo’s `useQuery()` and `useMutation()` hooks.

```tsx
import {useQuery} from '@apollo/client';
import {parseDocument} from '@quilted/apollo/client';

import helloQuerySource from './HelloQuery.graphql';

const helloQuery = parseDocument(helloQuerySource);

export function Start() {
  // Apollo will automatically know the shape of the data returned by this query!
  const {data, loading} = useQuery(helloQuery);

  return loading ? <p>Loading…</p> : <p>{data?.hello ?? 'Server error…'}</p>;
}
```

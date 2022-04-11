# `@quilted/react-query`

Integrates [React Query](https://react-query.tanstack.com/) with Quilt by automatically running your queries during server-side rendering.

## Installation

Install both `@quilted/react-query` and `react-query` as dependencies of your project:

```bash
$ pnpm add @quilted/react-query react-query --save
```

> **Note:** This library needs [`@quilted/quilt`](../../packages/quilt) installed in your local repository. If you have just [created a new Quilt app](../../documentation/getting-started.md), you already have this installed.

## Usage

[React Query’s getting started instructions](https://react-query.tanstack.com/overview) instruct you to create a `QueryClient` object, and pass it to a `QueryClientProvider` component. To integrate React Query with Quilt, you will pass your `QueryClient` object to this library’s `ReactQueryContext` component instead:

```tsx
import {useMemo} from 'react';
import {ReactQueryContext} from '@quilted/react-query';
import {QueryClient, useQuery} from 'react-query';

export default function App() {
  const client = useMemo(() => new QueryClient(), []);

  return (
    <ReactQueryContext client={queryClient}>
      <Example />
    </ReactQueryContext>
  );
}
```

The `ReactQueryContext` takes care of ensuring that all queries made by your application are run during server-side rendering. It serializes the results into your HTML payload, and [“hydrating” the query client](https://react-query.tanstack.com/guides/ssr#using-hydration) so that data is available when your application starts in the user’s browser. It also renders the `QueryClientProvider` for you, so you don’t need to do it yourself.

That’s all the setup you need! Elsewhere in your application, you can now use React Query’s [`useQuery` hook](https://react-query.tanstack.com/guides/queries) to load data in your components. The example below shows how you might use Quilt’s GraphQL utilities to perform type-safe GraphQL queries using React Query:

```tsx
import {useMemo} from 'react';
import {createGraphQL, createGraphQLHttpFetch} from '@quilted/quilt';
import {useQuery} from 'react-query';

import startQuery from './Start.graphql';

export function Start() {
  const {query} = useMemo(
    () =>
      createGraphQL({
        cache: false,
        fetch: createGraphQLHttpFetch({uri: 'https://my-graphql-api.com'}),
      }),
    [],
  );

  const result = useQuery('start-query', () => query(startQuery));

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

### Skipping queries during server rendering

By default, all queries are run during server-side rendering. You can change this behavior by passing `{server: false}` as the `meta` option for queries you’d only like to run on the client:

```tsx
import {useQuery} from 'react-query';

export function Start() {
  const result = useQuery(
    'my-client-only-data',
    () => fetch('https://my-api.com/data.json').then((result) => result.json()),
    {meta: {server: false}},
  );

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

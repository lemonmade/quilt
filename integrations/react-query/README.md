# `@quilted/react-query`

Integrates [TanStack React Query](https://tanstack.com/query/v4) with Quilt by automatically running your queries during server-side rendering.

> Quilt provides integrations for two popular React querying libraries: `react-query` (this library) and [`swr`](../swr). Which should you use? We recommend using `swr` until you find limitations that are solved by `react-query`. The reason is simple: `swr` is [~4Kb compressed](https://bundlephobia.com/package/swr), while `react-query` is [~13Kb compressed](https://bundlephobia.com/package/react-query@3.35.0). `react-query` provides a [detailed comparison of these libraries](https://tanstack.com/query/v4/docs/comparison) if you are interested in learning about more advanced features `react-query` supports with those extra bytes.

## Installation

Install both `@quilted/react-query` and `@tanstack/react-query` as dependencies of your project:

```bash
$ pnpm add @quilted/react-query @tanstack/react-query --save
```

> **Note:** This library needs [`@quilted/quilt`](../../packages/quilt) installed in your local repository. If you have just [created a new Quilt app](../../documentation/getting-started.md), you already have this installed.

## Usage

[React Query’s getting started instructions](https://tanstack.com/query/v4/docs/quick-start) instruct you to create a `QueryClient` object, and pass it to a `QueryClientProvider` component. To integrate React Query with Quilt, you will pass your `QueryClient` object to this library’s `ReactQueryContext` component instead:

```tsx
import {useMemo} from 'preact/hooks';
import {QueryClient} from '@tanstack/react-query';
import {ReactQueryContext} from '@quilted/react-query';

export default function App() {
  const client = useMemo(() => new QueryClient(), []);

  return (
    <ReactQueryContext client={client}>
      <Example />
    </ReactQueryContext>
  );
}
```

The `ReactQueryContext` takes care of ensuring that all queries made by your application are run during server-side rendering. It serializes the results into your HTML payload, and [“hydrating” the query client](https://tanstack.com/query/v4/docs/reference/hydration) so that data is available when your application starts in the user’s browser. It also renders the `QueryClientProvider` for you, so you don’t need to do it yourself.

That’s all the setup you need! Elsewhere in your application, you can now use React Query’s [`useSuspenseQuery` hook](https://tanstack.com/query/v4/docs/reference/useSuspenseQuery) to load data in your components. The example below shows how you might use Quilt’s GraphQL utilities to perform type-safe GraphQL queries using React Query:

```tsx
import {createGraphQLFetch} from '@quilted/quilt/graphql';
import {useSuspenseQuery} from '@tanstack/react-query';

import homeQuery from './Home.graphql';

const query = createGraphQLFetch({uri: 'https://my-graphql-api.com'});

export function Home() {
  const result = useSuspenseQuery({
    queryKey: ['home-query'],
    queryFn: () => query(homeQuery),
  });

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

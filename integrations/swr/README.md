# `@quilted/swr`

Integrates [swr](https://swr.vercel.app) with Quilt by automatically running your queries during server-side rendering.

## Installation

Install both `@quilted/swr` and `swr` as dependencies of your project:

```bash
$ pnpm add @quilted/swr swr --save
```

> **Note:** This library needs [`@quilted/quilt`](../../packages/quilt) installed in your local repository. If you have just [created a new Quilt app](../../documentation/getting-started.md), you already have this installed.

## Usage

To integrate swr with Quilt, you need to render the `SWRContext` provided by this library around your application:

```tsx
import {SWRContext} from '@quilted/swr';

export default function App() {
  return (
    <SWRContext>
      <Users />
    </SWRContext>
  );
}

// We’ll fill this in this soon!
function Users() {
  return null;
}
```

The `SWRContext` takes care of running all queries made by your application during server-side rendering. It serializes the results into your HTML payload, and [“hydrating” the query client](https://swr.vercel.app/docs/with-nextjs) so that data is available when your application starts in the user’s browser.

`SWRContext` also renders swr’s [`SWRConfig` component](https://swr.vercel.app/docs/global-configuration). You can pass any [global swr configuration](https://swr.vercel.app/docs/global-configuration) to this component using the `config` property:

```tsx
import {useMemo} from 'react';
import {SWRContext} from '@quilted/swr';

const SWR_CONFIG = {refreshInterval: 5_000};

export default function App() {
  return (
    <SWRContext config={SWR_CONFIG}>
      <Users />
    </SWRContext>
  );
}

// We’ll fill this in this soon!
function Users() {
  return null;
}
```

That’s all the setup you need! Elsewhere in your application, you can now use the [`useSWR` hook](https://swr.vercel.app/docs/data-fetching) from this library to load data in your components. Note that you **must** use the `useSWR` hook exported by this library, and not the one exported as the default export from the `swr` package. This hook accepts all the same arguments as the base `useSWR` hook.

```tsx
import {useMemo} from 'react';
import {SWRContext, useSWR} from '@quilted/swr';

export default function App() {
  return (
    <SWRContext>
      <Users />
    </SWRContext>
  );
}

function Users() {
  const {data} = useSWR(
    'users',
    () => fetch('/api/users.json').then((result) => result.json()),
    {revalidateOnMount: false},
  );

  return (
    <>
      <p>Data:</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
```

### Skipping queries during server rendering

By default, all queries are run during server-side rendering. You can change this behavior by passing `{server: false}` as an option to `useSWR` for queries you’d only like to run on the client:

```tsx
import {useSWR} from '@quilted/swr';

export function Users() {
  // This query will not run during server rendering.
  const {data} = useSWR(
    'users',
    () => fetch('/api/users.json').then((result) => result.json()),
    {server: false},
  );

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

### GraphQL

You can execute type-safe GraphQL queries using swr with this library’s `useGraphQLQuery` hook. This hook accepts a GraphQL query and, optionally, the variables for that query, and will execute that query using swr’s data loading and the [GraphQL client in context](#TODO). You will get strong typing, both on the required variables and the resulting data.

```tsx
import {useGraphQLQuery} from '@quilted/swr';

// Assume a the following query:
// query Users ($first: Int!) { users(first: $first) { id, name } }
import usersQuery from './UsersQuery.graphql';

export function Users() {
  const {data} = useGraphQLQuery(users, {variables: {first: 10}});

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

In addition to variables, you can pass any other option [accepted by `useSWR`](https://swr.vercel.app/docs/data-fetching):

```tsx
import {useGraphQLQuery} from '@quilted/swr';

// Assume a the following query:
// query Users ($first: Int!) { users(first: $first) { id, name } }
import usersQuery from './UsersQuery.graphql';

export function Users() {
  const {data} = useGraphQLQuery(users, {
    variables: {first: 10},
    // Refresh every minute
    refreshInterval: 60_000,
  });

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

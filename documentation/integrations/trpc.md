# Using [tRPC](https://trpc.io)

tRPC lets you build type-safe APIs that are easy to call from your front-end. It lets you define a clear contract over the inputs and outputs of your backend, without you needing to worry about REST or GraphQL endpoints.

Because tRPC has both a client and server component, you’ll need to follow a few steps to use it in a [Quilt application](../projects/apps):

1. [Create a tRPC router](#create-a-trpc-router)
1. [Expose tRPC through your app server](#expose-trpc-through-your-app-server)
1. [Render tRPC’s React providers](#render-trpcs-react-providers)
1. [Use tRPC’s React hooks](#use-trpcs-react-hooks)

To follow this guide, you’ll need a Quilt app with a [custom server](../projects/apps/server.md). The easiest way to get started is to follow the [app creation guide, and picking the “basic” template](../getting-started.md#creating-an-app). You’ll also need to install [tRPC’s server and React dependencies](https://trpc.io/docs/react), and [`@quilted/react-query`](../../integrations/react-query/) (tRPC uses [`@tanstack/react-query`](https://tanstack.com/query/v4) for client-side data fetching):

```bash
# npm
npm install --save-dev @trpc/client @trpc/server @trpc/react-query @tanstack/react-query @quilted/react-query
# pnpm
pnpm add --save-dev @trpc/client @trpc/server @trpc/react-query @tanstack/react-query @quilted/react-query
# yarn
yarn add --dev @trpc/client @trpc/server @trpc/react-query @tanstack/react-query @quilted/react-query
```

## Create a tRPC router

The first step in any tRPC project is [setting up a router](https://trpc.io/docs/quickstart). This process defines what queries and mutations are available through tRPC, and allows you to validate their inputs.

As an example, let’s create a simple router that will respond to a `message` query by returning a friendly greeting. Assuming we have a Quilt app in the `app` directory, we could define our tRPC router in an `app/trpc.ts` file like so:

```ts
// app/trpc.ts

import {initTRPC} from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  message: t.procedure
    .input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error(`Invalid input: ${typeof val}`);
    })
    .query(({input}) => `Hello, ${input}!`),
});

// Export type router type signature, not the router itself.
// Our client-side code will use this type to infer the
// procedures that are defined.
export type AppRouter = typeof appRouter;
```

The rest of our app will use this router (and its associated TypeScript type) to get automatic type-safety.

## Expose tRPC through your app server

tRPC needs to be accessible through an API endpoint on your server. If you have created a [“basic” Quilt app](../getting-started.md#app-templates), you will have a customizable server in your `app/server.tsx` file. You can add an `/api` path that will contain all of your tRPC procedures bya adding the following route to your [request router](../features/request-routing.md):

```tsx
// app/server.tsx

import {createRequestRouter} from '@quilted/quilt/server';
import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

import {appRouter} from './trpc';

const router = createRequestRouter();

router.any(
  'api',
  (request) => {
    return fetchRequestHandler({
      endpoint: '/api',
      req: request,
      router: appRouter,
      createContext: () => ({}),
    });
  },
  {exact: false},
);

// Other routes, like the one to render your React app, go here...
```

For more details on setting up the tRPC server, you can read up on [tRPC’s `fetch` adaptor](https://trpc.io/docs/fetch), which supports the request and response format used by Quilt’s request router library.

## Render tRPC’s React providers

tRPC provides a collection of [React providers and hooks](https://trpc.io/docs/react#client-side) to make use of procedures in your React components. In addition to its own providers, tRPC also uses [`@tanstack/react-query`](https://tanstack.com/query/v4) for client-side data fetching, so you will also need to use Quilt’s [react-query library](../../integrations/react-query/) for full server-side rendering of tRPC queries.

First, we will export tRPC’s React utilities from a shared location in our repo. These utilities include both the providers you need to wrap around your entire app, and the hooks that components in your app will use to make tRPC queries. We’ll create a `app/shared/trpc.ts` file for this, because the basic template creates handy aliases for files in the `shared` directory:

```ts
// app/shared/trpc.ts

import {createTRPCReact} from '@trpc/react-query';

// Get access to our app’s router type signature, which will
// provide strong typing on the queries and mutations we can
// perform.
import {type AppRouter} from '../../trpc';

export const trpc = createTRPCReact<AppRouter>();
```

The basic app renders a number of “global” context providers in the main `app/App.tsx` module. We can add the necessary tRPC providers there as well:

```tsx
// app/App.tsx

import {useMemo} from 'react';
import {
  AppContext,
  useInitialUrl,
  type PropsWithChildren,
} from '@quilted/quilt';

import {httpBatchLink} from '@trpc/client';
import {createTRPCReact} from '@trpc/react-query';

import {QueryClient} from '@tanstack/react-query';
import {ReactQueryContext} from '@quilted/react-query';

import {trpc} from '~/shared/trpc';

// This is your default App component. When creating a template, it
// will already be defined, so you will just need to wrap the main
// part of your app in the Trpc component defined below.
export default function App() {
  return (
    <AppContext>
      <Trpc>{/* existing children of AppContext */}</Trpc>
    </AppContext>
  );
}

function Trpc({children}: PropsWithChildren) {
  const initialUrl = useInitialUrl();

  const queryClient = useMemo(() => new QueryClient(), []);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          // We need to use an absolute URL so that queries will
          // work during server-side rendering
          httpBatchLink({url: new URL('/trpc', initialUrl).href}),
        ],
      }),
    [initialUrl],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ReactQueryContext client={queryClient}>{children}</ReactQueryContext>
    </trpc.Provider>
  );
}
```

## Use tRPC’s React hooks

Now, for the important part: using tRPC to fetch data for our UI! We can use the `shared/trpc.ts` file we created earlier to access our strongly-typed hooks for querying tRPC data from any component in our app:

```tsx
import {trpc} from '~/shared/trpc';

export function Greeting() {
  // Get the name to greet from the URL search params
  const name = useCurrentUrl().searchParams.get('name');
  const {data, isLoading} = trpc.message.useQuery(name ?? 'Unknown user');

  return <p>{isLoading ? 'Loading...' : data}</p>;
}
```

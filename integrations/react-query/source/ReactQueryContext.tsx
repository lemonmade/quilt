import type {RenderableProps, ComponentType} from 'preact';
import {Suspense} from 'preact/compat';
import {
  dehydrate,
  QueryClient,
  QueryClientProvider as QueryClientProviderReact,
  type QueryClientProviderProps,
  HydrationBoundary as HydrationBoundaryReact,
  type HydrationBoundaryProps,
  type DehydratedState,
} from '@tanstack/react-query';
import {useSerialized} from '@quilted/quilt/browser';
import {Serialize} from '@quilted/quilt/server';

const SERIALIZATION_ID = 'quilt:react-query';

const HydrationBoundary = HydrationBoundaryReact as ComponentType<
  Omit<HydrationBoundaryProps, 'children'>
>;
const QueryClientProvider = QueryClientProviderReact as ComponentType<
  Omit<QueryClientProviderProps, 'children'>
>;

export function ReactQueryContext({
  client,
  children,
}: RenderableProps<{client: QueryClient}>) {
  const dehydratedState = useSerialized<DehydratedState | undefined>(
    SERIALIZATION_ID,
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={dehydratedState}>
        {children as any}
      </HydrationBoundary>

      {/**
       * This must run after any children that perform queries on the server. The
       * `Serializer` component will wait until any pending queries are resolved,
       * and once resolved, will add a serialization for the contents of the
       * React Query client. We wrap this process in a Suspense boundary so that
       * it just makes the server wait, but does not force any parent components to
       * re-render once the suspense promise resolves.
       */}
      <Suspense fallback={null}>
        <Serializer client={client} />
      </Suspense>
    </QueryClientProvider>
  );
}

function Serializer({client}: {client: QueryClient}) {
  if (typeof document === 'object') return null;

  const promises: Promise<any>[] = [];

  for (const query of client.getQueryCache().getAll()) {
    const {state, options, meta} = query;

    if (state.status === 'success' || state.status === 'error') continue;
    if ((options as any).enabled === false) continue;
    if (meta != null && meta.server === false) continue;

    promises.push(query.fetch());
  }

  if (promises.length > 0) {
    throw Promise.all(promises).then(() => {});
  }

  return (
    <Serialize
      id={SERIALIZATION_ID}
      value={() =>
        dehydrate(client, {
          shouldDehydrateQuery: () => true,
        })
      }
    />
  );
}

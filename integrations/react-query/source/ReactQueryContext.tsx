import type {RenderableProps, ComponentType} from 'preact';
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
import {useResponseSerialization} from '@quilted/quilt/server';

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

  if (typeof document === 'undefined') {
    useResponseSerialization(SERIALIZATION_ID, () =>
      dehydrate(client, {
        shouldDehydrateQuery: () => true,
      }),
    );
  }

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={dehydratedState}>
        {children as any}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

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
      {typeof document === 'undefined' && (
        <Serialize
          name={SERIALIZATION_ID}
          content={() =>
            dehydrate(client, {
              shouldDehydrateQuery: () => true,
            })
          }
        />
      )}
    </QueryClientProvider>
  );
}

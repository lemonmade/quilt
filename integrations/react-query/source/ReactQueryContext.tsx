import type {PropsWithChildren} from 'react';
import {
  QueryClientProvider,
  QueryClient,
  dehydrate,
  HydrationBoundary,
  type DehydratedState,
} from '@tanstack/react-query';
import {useSerialized} from '@quilted/quilt/browser';
import {Serialize} from '@quilted/quilt/server';

const SERIALIZATION_ID = 'quilt:react-query';

export function ReactQueryContext({
  client,
  children,
}: PropsWithChildren<{client: QueryClient}>) {
  const dehydratedState = useSerialized<DehydratedState | undefined>(
    SERIALIZATION_ID,
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
      <Serializer client={client} />
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

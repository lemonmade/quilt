import {useMemo, type PropsWithChildren} from 'react';
import {
  QueryClientProvider,
  QueryClient,
  dehydrate,
  Hydrate,
} from '@tanstack/react-query';
import {useSerialized} from '@quilted/quilt/html';

export interface ReactQueryServerRenderer {
  fetchAll(): Promise<void> | undefined;
}

export function ReactQueryContext({
  client,
  children,
}: PropsWithChildren<{client: QueryClient}>) {
  const serverRenderer = useMemo<ReactQueryServerRenderer>(() => {
    return {
      fetchAll() {
        const promises: Promise<any>[] = [];

        for (const query of client.getQueryCache().getAll()) {
          const {state, options, meta} = query;

          if (state.status === 'success' || state.status === 'error') continue;
          if ((options as any).enabled === false) continue;
          if (meta != null && meta.server === false) continue;

          promises.push(query.fetch());
        }

        if (promises.length > 0) {
          return Promise.all(promises).then(() => {});
        }
      },
    };
  }, [client]);

  const hydrationState = useSerialized('ReactQuery', () => {
    const fetched = serverRenderer.fetchAll();

    return typeof fetched === 'object'
      ? fetched.then(() => finalize())
      : finalize();

    function finalize() {
      return dehydrate(client, {
        shouldDehydrateQuery: () => true,
      }) as Record<string, any>;
    }
  });

  return (
    <QueryClientProvider client={client}>
      <Hydrate state={hydrationState}>{children}</Hydrate>
    </QueryClientProvider>
  );
}

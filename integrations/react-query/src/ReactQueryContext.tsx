import {useMemo, createContext} from 'react';
import {
  QueryClientProvider,
  QueryClient,
  dehydrate,
  Hydrate,
} from 'react-query';
import type {PropsWithChildren} from '@quilted/quilt';
import {useSerialized} from '@quilted/quilt/html';

export interface ReactQueryServerRenderer {
  fetchAll(): Promise<void> | undefined;
}

const ReactQueryServerRendererContext =
  createContext<ReactQueryServerRenderer | null>(null);

export function ReactQueryContext({
  client,
  children,
}: PropsWithChildren<{client: QueryClient}>) {
  const serverRenderer = useMemo<ReactQueryServerRenderer>(() => {
    return {
      fetchAll() {
        const promises: Promise<any>[] = [];

        for (const query of client.getQueryCache().getAll()) {
          const {state} = query;

          if (state.status === 'success' || state.status === 'error') continue;
          if (query.meta != null && query.meta.server === false) continue;

          promises.push(query.fetch());
        }

        if (promises.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
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
    <ReactQueryServerRendererContext.Provider value={serverRenderer}>
      <QueryClientProvider client={client}>
        <Hydrate state={hydrationState}>{children}</Hydrate>
      </QueryClientProvider>
    </ReactQueryServerRendererContext.Provider>
  );
}

import {useMemo} from 'react';
import type {ComponentProps} from 'react';
import {SWRConfig, unstable_serialize} from 'swr';

import {useSerialized} from '@quilted/quilt/html';
import type {PropsWithChildren} from '@quilted/quilt';

import {SWRServerRendererContext, SERVER_ACTION_KIND} from './server-render';
import type {SWRServerRenderer} from './server-render';

export function SWRContext({
  config,
  children,
}: PropsWithChildren<{
  config?: ComponentProps<typeof SWRConfig>['value'];
}>) {
  const serialized = useSerialized('SWR', () => {
    return serverRenderer.extract() as Record<string, any>;
  });

  const serverRenderer = useMemo<SWRServerRenderer>(() => {
    const runCache = new Map<string, Promise<any>>();
    const resultCache: Record<string, any> = {...serialized};

    return {
      kind: {id: SERVER_ACTION_KIND},
      run(key, fetcher: (...args: any[]) => any) {
        let serializedKey: string;

        try {
          serializedKey = unstable_serialize(key);
        } catch (error) {
          // SWR allows throwing errors for a key as a way of marking dependent
          // queries.
          // @see https://swr.vercel.app/docs/conditional-fetching#dependent
          return Promise.resolve();
        }

        if (Reflect.has(resultCache, serializedKey)) {
          return Promise.resolve(resultCache[serializedKey]);
        } else if (runCache.has(serializedKey)) {
          return runCache.get(serializedKey)!;
        }

        const normalizedKey = typeof key === 'function' ? key() : key;
        const argumentsFromKey = (
          Array.isArray(normalizedKey) ? normalizedKey : [normalizedKey]
        ) as [any, ...any[]];

        // TODO: better optimization for synchronously-available data?
        const promise = Promise.resolve<any>(fetcher(...argumentsFromKey)).then(
          (result) => {
            resultCache[serializedKey] = result;
            return result;
          },
        );

        runCache.set(serializedKey, promise);

        return promise;
      },
      extract: () =>
        runCache.size > 0
          ? Promise.all([...runCache.values()]).then(() => resultCache)
          : resultCache,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedConfig = useMemo(() => {
    return {
      ...config,
      fallback: {
        ...serialized,
        ...config?.fallback,
      },
    };
  }, [config, serialized]);

  return (
    <SWRServerRendererContext.Provider value={serverRenderer}>
      <SWRConfig value={normalizedConfig}>{children}</SWRConfig>
    </SWRServerRendererContext.Provider>
  );
}

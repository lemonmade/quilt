import {useCallback, useContext, useMemo, useSyncExternalStore} from 'react';
import type {AsyncModule} from '@quilted/async';
import {useServerAction} from '@quilted/react-server-render';

import {AsyncAssetContext} from '../context';
import type {AssetLoadTiming} from '../types';

interface Options {
  immediate?: boolean;
  styles?: AssetLoadTiming;
  scripts?: AssetLoadTiming;
}

export function useAsyncModule<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
  {scripts, styles, immediate = true}: Options = {},
) {
  const async = useContext(AsyncAssetContext);

  const {id} = asyncModule;
  const load = useCallback(() => asyncModule.load(), [asyncModule]);

  const value = useSyncExternalStore(
    ...useMemo<Parameters<typeof useSyncExternalStore<Module | undefined>>>(
      () => [
        (callback) => {
          const abort = new AbortController();
          asyncModule.subscribe(callback, {signal: abort.signal});
          return () => abort.abort();
        },
        () => {
          return typeof window !== 'undefined' || immediate
            ? asyncModule.loaded
            : undefined;
        },
      ],
      [immediate, asyncModule],
    ),
  );

  useServerAction(() => {
    if (!immediate || asyncModule.loaded != null) return;
    return asyncModule.load();
  }, async?.serverAction);

  useAsyncAssetsForModule(id, {scripts, styles});

  return value instanceof Error
    ? {id, resolved: undefined, error: value, loading: false, load}
    : {
        id,
        resolved: value,
        error: null,
        loading: value == null,
        load,
      };
}

export function useAsyncAssetsForModule(
  id?: string,
  {scripts, styles}: {styles?: AssetLoadTiming; scripts?: AssetLoadTiming} = {},
) {
  const async = useContext(AsyncAssetContext);

  useServerAction(() => {
    if (async && id) {
      async.markAsUsed(id, {scripts, styles});
    }
  }, async?.serverAction);
}

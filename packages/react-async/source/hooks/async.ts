import {useCallback, useContext, useMemo, useSyncExternalStore} from 'react';
import type {AsyncLoader} from '@quilted/async';
import {useServerAction} from '@quilted/react-server-render';

import {AsyncAssetContext} from '../context';
import type {AssetLoadTiming} from '../types';

interface Options {
  immediate?: boolean;
  styles?: AssetLoadTiming;
  scripts?: AssetLoadTiming;
}

export function useAsync<T>(
  asyncLoader: AsyncLoader<T>,
  {scripts, styles, immediate = true}: Options = {},
) {
  const async = useContext(AsyncAssetContext);

  const {id} = asyncLoader;
  const load = useCallback(() => asyncLoader.load(), [asyncLoader]);

  const value = useSyncExternalStore(
    ...useMemo<Parameters<typeof useSyncExternalStore<T | undefined>>>(
      () => [
        (callback) => {
          return asyncLoader.subscribe(callback);
        },
        () => {
          return typeof window !== 'undefined' || immediate
            ? asyncLoader.loaded
            : undefined;
        },
      ],
      [immediate, asyncLoader],
    ),
  );

  useServerAction(() => {
    if (!immediate || asyncLoader.loaded != null) return;
    return asyncLoader.load();
  }, async?.serverAction);

  useAsyncAsset(id, {scripts, styles});

  return value instanceof Error
    ? {id, resolved: null, error: value, loading: false, load}
    : {
        id,
        resolved: value,
        error: null,
        loading: value == null,
        load,
      };
}

export function useAsyncAsset(
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

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
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
        () => (immediate ? asyncModule.loaded : undefined),
      ],
      [asyncModule, immediate],
    ),
  );

  useServerAction(() => {
    if (immediate && asyncModule.loaded == null) return asyncModule.load();
  }, async?.serverAction);

  useAsyncModuleAssets(asyncModule, {scripts, styles});

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

export function useAsyncModulePreload<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
) {
  useAsyncModuleAssets(asyncModule, {scripts: 'preload', styles: 'preload'});

  useEffect(() => {
    asyncModule.load();
  }, [asyncModule]);
}

export function useAsyncModuleAssets<Module = Record<string, unknown>>(
  {id}: AsyncModule<Module>,
  {scripts, styles}: {styles?: AssetLoadTiming; scripts?: AssetLoadTiming} = {},
) {
  const async = useContext(AsyncAssetContext);

  useServerAction(() => {
    if (async && id) {
      async.markAsUsed(id, {scripts, styles});
    }
  }, async?.serverAction);
}

import {useContext} from 'react';
import type {AssetsCacheKey, AssetLoadTiming} from '@quilted/assets';
import {useServerAction} from '@quilted/react-server-render';

import {AssetsContext} from './context.ts';

export function useAssetsCacheKey(cacheKey: Partial<AssetsCacheKey>) {
  const assets = useContext(AssetsContext);

  useServerAction(() => {
    assets.updateCacheKey(cacheKey);
  }, assets.serverAction);
}

export function useModuleAssets(
  id?: string,
  {scripts, styles}: {styles?: AssetLoadTiming; scripts?: AssetLoadTiming} = {},
) {
  const assets = useContext(AssetsContext);

  useServerAction(() => {
    if (id) {
      assets.useModule(id, {scripts, styles});
    }
  }, assets.serverAction);
}

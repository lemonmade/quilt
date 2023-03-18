import {useContext} from 'react';
import type {AssetsCacheKey} from '@quilted/assets';
import {useServerAction} from '@quilted/react-server-render';

import {AssetsContext} from './context';

export function useAssetsCacheKey(cacheKey: Partial<AssetsCacheKey>) {
  const assets = useContext(AssetsContext);

  useServerAction(() => {
    assets.update(cacheKey);
  }, assets.serverAction);
}

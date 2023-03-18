import {useContext} from 'react';
import type {AssetsCacheKey} from '@quilted/assets';
import {useServerAction} from '@quilted/react-server-render';

import {AssetsContext} from './context';

export function useUpdateCacheKey(cacheKey: Partial<AssetsCacheKey>) {
  const assets = useContext(AssetsContext);

  useServerAction(() => {
    assets.updateCacheKey(cacheKey);
  }, assets.serverAction);
}

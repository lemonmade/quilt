import type {AssetLoadTiming, AssetsCacheKey} from '@quilted/assets';
import {useBrowserResponseAction} from './browser-response-action.ts';

export function useAssetsCacheKey(cacheKey: Partial<AssetsCacheKey>) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.assets.updateCacheKey(cacheKey);
  });
}

export function useModuleAssets(
  id?: string,
  {scripts, styles}: {styles?: AssetLoadTiming; scripts?: AssetLoadTiming} = {},
) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    if (id) response.assets.use(id, {scripts, styles});
  });
}

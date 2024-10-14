import type {AssetLoadTiming} from '@quilted/assets';
import {useBrowserResponseAction} from './browser-response-action.ts';

export function useModuleAssets(
  id?: string,
  {scripts, styles}: {styles?: AssetLoadTiming; scripts?: AssetLoadTiming} = {},
) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    if (id) response.assets.use(id, {scripts, styles});
  });
}

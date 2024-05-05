import {scriptAssetPreloadAttributes, type Asset} from '@quilted/assets';

export interface ScriptPreloadProps {
  asset: Asset;
  baseURL?: URL;
}

export function ScriptAssetPreload({asset, baseURL}: ScriptPreloadProps) {
  const attributes = scriptAssetPreloadAttributes(asset, {
    baseURL,
  });

  return <link {...(attributes as any)} />;
}

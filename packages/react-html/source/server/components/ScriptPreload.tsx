import {scriptAssetPreloadAttributes, type Asset} from '@quilted/assets';

export interface ScriptPreloadProps {
  asset: Asset;
  baseUrl?: URL;
}

export function ScriptPreload({asset, baseUrl}: ScriptPreloadProps) {
  const attributes = scriptAssetPreloadAttributes(asset, {
    baseUrl,
  });

  return <link key={asset.source} {...(attributes as any)} />;
}

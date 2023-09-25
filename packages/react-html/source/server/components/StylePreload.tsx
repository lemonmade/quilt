import {styleAssetPreloadAttributes, type Asset} from '@quilted/assets';

export interface StylePreloadProps {
  asset: Asset;
  baseUrl?: URL;
}

export function StylePreload({asset, baseUrl}: StylePreloadProps) {
  const attributes = styleAssetPreloadAttributes(asset, {
    baseUrl,
  });

  return <link key={asset.source} {...(attributes as any)} />;
}

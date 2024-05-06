import {styleAssetPreloadAttributes, type Asset} from '@quilted/assets';

export interface StylePreloadProps {
  asset: Asset;
  baseURL?: URL;
}

export function StyleAssetPreload({asset, baseURL}: StylePreloadProps) {
  const attributes = styleAssetPreloadAttributes(asset, {
    baseURL,
  });

  return <link {...(attributes as any)} />;
}

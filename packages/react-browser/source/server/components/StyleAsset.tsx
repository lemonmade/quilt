import {styleAssetAttributes, type Asset} from '@quilted/assets';

export interface StyleProps {
  asset: Asset;
  baseURL?: URL;
}

export function StyleAsset({asset, baseURL}: StyleProps) {
  const attributes = styleAssetAttributes(asset, {
    baseURL,
  });

  return <link {...(attributes as any)} />;
}

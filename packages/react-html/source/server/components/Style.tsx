import {styleAssetAttributes, type Asset} from '@quilted/assets';

export interface StyleProps {
  asset: Asset;
  baseUrl?: URL;
}

export function Style({asset, baseUrl}: StyleProps) {
  const attributes = styleAssetAttributes(asset, {
    baseUrl,
  });

  return <link key={asset.source} {...(attributes as any)} />;
}

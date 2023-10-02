import {scriptAssetAttributes, type Asset} from '@quilted/assets';

export interface ScriptProps {
  asset: Asset;
  baseUrl?: URL;
}

export function Script({asset, baseUrl}: ScriptProps) {
  const attributes = scriptAssetAttributes(asset, {
    baseUrl,
  });

  const loadingAttribute =
    attributes.type === 'module'
      ? {async: attributes.async ?? true}
      : {defer: attributes.defer ?? true};

  return (
    <script key={asset.source} {...loadingAttribute} {...(attributes as any)} />
  );
}

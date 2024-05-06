import {scriptAssetAttributes, type Asset} from '@quilted/assets';

export interface ScriptProps {
  asset: Asset;
  baseURL?: URL;
}

export function ScriptAsset({asset, baseURL}: ScriptProps) {
  const attributes = scriptAssetAttributes(asset, {
    baseURL,
  });

  const loadingAttribute =
    attributes.type === 'module'
      ? {async: attributes.async ?? true}
      : {defer: attributes.defer ?? true};

  return <script {...loadingAttribute} {...(attributes as any)} />;
}

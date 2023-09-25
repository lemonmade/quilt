import {scriptAssetAttributes, type Asset} from '@quilted/assets';

export interface ScriptsProps {
  assets?: Asset[];
  baseUrl?: URL;
}

export function Scripts({assets, baseUrl}: ScriptsProps) {
  return assets ? (
    <>
      {assets.map((script) => {
        const attributes = scriptAssetAttributes(script, {
          baseUrl,
        });

        return <script key={script.source} {...(attributes as any)} defer />;
      })}
    </>
  ) : null;
}

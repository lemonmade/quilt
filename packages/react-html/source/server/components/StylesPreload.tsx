import {styleAssetAttributes, type Asset} from '@quilted/assets';

export interface StylesPreloadProps {
  assets?: Asset[];
  baseUrl?: URL;
}

export function StylesPreload({assets, baseUrl}: StylesPreloadProps) {
  return assets ? (
    <>
      {assets.map((style) => {
        const attributes = styleAssetAttributes(style, {
          baseUrl,
        });

        return <link key={style.source} {...(attributes as any)} defer />;
      })}
    </>
  ) : null;
}

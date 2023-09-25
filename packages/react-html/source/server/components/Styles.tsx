import {styleAssetAttributes, type Asset} from '@quilted/assets';

export interface StylesProps {
  assets?: Asset[];
  baseUrl?: URL;
}

export function Styles({assets, baseUrl}: StylesProps) {
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

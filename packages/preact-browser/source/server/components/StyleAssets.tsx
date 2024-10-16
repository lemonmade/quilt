import type {JSX} from 'preact';
import {styleAssetAttributes, type Asset} from '@quilted/assets';
import {useResolvedBaseURL} from './shared/base-url.ts';

export function StyleAssets({
  styles,
  baseURL: explicitBaseURL,
  ...rest
}: {
  styles: readonly Asset[];
  baseURL?: string | URL;
} & JSX.HTMLAttributes<HTMLLinkElement>) {
  const baseURL = useResolvedBaseURL(explicitBaseURL);

  return (
    <>
      {styles.map((asset) => (
        <link
          key={asset.source}
          {...(styleAssetAttributes(asset, {
            baseURL,
          }) as JSX.HTMLAttributes<HTMLLinkElement>)}
          {...rest}
        />
      ))}
    </>
  );
}

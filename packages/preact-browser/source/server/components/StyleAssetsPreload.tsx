import type {JSX} from 'preact';
import {styleAssetPreloadAttributes, type Asset} from '@quilted/assets';
import {useResolvedBaseURL} from './shared/base-url.ts';

export function StyleAssetsPreload({
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
          {...(styleAssetPreloadAttributes(asset, {
            baseURL,
          }) as JSX.HTMLAttributes<HTMLLinkElement>)}
          {...rest}
        />
      ))}
    </>
  );
}

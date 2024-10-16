import type {JSX} from 'preact';
import {scriptAssetPreloadAttributes, type Asset} from '@quilted/assets';
import {useResolvedBaseURL} from './shared/base-url.ts';

export function ScriptAssetsPreload({
  scripts,
  baseURL: explicitBaseURL,
  ...rest
}: {
  scripts: readonly Asset[];
  baseURL?: string | URL;
} & JSX.HTMLAttributes<HTMLLinkElement>) {
  const baseURL = useResolvedBaseURL(explicitBaseURL);

  return (
    <>
      {scripts.map((asset) => (
        <link
          key={asset.source}
          {...(scriptAssetPreloadAttributes(asset, {
            baseURL,
          }) as JSX.HTMLAttributes<HTMLLinkElement>)}
          {...rest}
        />
      ))}
    </>
  );
}

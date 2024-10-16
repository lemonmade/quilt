import type {JSX} from 'preact';
import {scriptAssetAttributes, type Asset} from '@quilted/assets';
import {useResolvedBaseURL} from './shared/base-url.ts';

export function ScriptAssets({
  scripts,
  baseURL: explicitBaseURL,
  ...rest
}: {
  scripts: readonly Asset[];
  baseURL?: string | URL;
} & JSX.HTMLAttributes<HTMLScriptElement>) {
  const baseURL = useResolvedBaseURL(explicitBaseURL);

  return (
    <>
      {scripts.map((asset) => (
        <script
          key={asset.source}
          {...(scriptAssetAttributes(asset, {
            baseURL,
          }) as JSX.HTMLAttributes<HTMLScriptElement>)}
          {...rest}
        />
      ))}
    </>
  );
}

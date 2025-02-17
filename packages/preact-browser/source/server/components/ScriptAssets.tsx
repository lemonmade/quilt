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
      {scripts.map((asset) => {
        const props: JSX.ScriptHTMLAttributes = {};

        Object.assign(props, scriptAssetAttributes(asset, {baseURL}), rest);

        if (asset.content) {
          props.dangerouslySetInnerHTML = {__html: asset.content};
        } else {
          props.src = asset.source;
        }

        return <script {...props} />;
      })}
    </>
  );
}

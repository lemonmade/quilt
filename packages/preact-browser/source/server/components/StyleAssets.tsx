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
      {styles.map((asset) => {
        const props: JSX.LinkHTMLAttributes<any> = {};

        Object.assign(props, styleAssetAttributes(asset, {baseURL}), rest);

        if (asset.content) {
          delete props.href;
          delete props.crossorigin;
          delete props.crossOrigin;

          return (
            <style
              {...props}
              dangerouslySetInnerHTML={{__html: asset.content}}
            />
          );
        } else {
          return <link {...props} href={asset.source} />;
        }
      })}
    </>
  );
}

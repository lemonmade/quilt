/* eslint react/no-unknown-property: off */

import {type ReactElement} from 'react';
import {
  styleAssetAttributes,
  scriptAssetAttributes,
  type BrowserAssetsEntry,
  scriptAssetPreloadAttributes,
  styleAssetPreloadAttributes,
} from '@quilted/assets';

import {HtmlManager} from '../../manager.ts';
import {Serialize} from './Serialize.tsx';

export interface HeadProps {
  html?: HtmlManager;
  baseUrl?: URL;
  assets?: BrowserAssetsEntry;
  preloadAssets?: BrowserAssetsEntry;
  children?: ReactElement;
}

export function Head({
  html,
  baseUrl,
  assets,
  preloadAssets,
  children,
}: HeadProps) {
  const extracted = html?.extract();

  const serializationContent = extracted?.serializations.map(({id, data}) => (
    <Serialize key={id} id={id} data={data} />
  ));

  const titleContent = extracted?.title ? (
    <title>{extracted.title}</title>
  ) : null;

  const metaContent = extracted?.metas.map((metaProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <meta key={index} {...metaProps} />
  ));

  const linkContent = extracted?.links.map((linkProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <link key={index} {...linkProps} />
  ));

  const scriptContent = extracted?.scripts.map((scriptProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <script key={index} {...scriptProps} />
  ));

  return (
    <>
      {titleContent}
      {metaContent}
      {serializationContent}

      {scriptContent}

      {linkContent}

      {assets &&
        assets.styles.map((style) => {
          const attributes = styleAssetAttributes(style, {baseUrl});
          return <link key={style.source} {...(attributes as any)} />;
        })}

      {assets &&
        assets.scripts.map((script) => {
          const attributes = scriptAssetAttributes(script, {
            baseUrl,
          });

          return <script key={script.source} {...(attributes as any)} defer />;
        })}

      {preloadAssets &&
        preloadAssets.styles.map((style) => {
          const attributes = styleAssetPreloadAttributes(style, {
            baseUrl,
          });

          return <link key={style.source} {...(attributes as any)} />;
        })}

      {preloadAssets &&
        preloadAssets.scripts.map((script) => {
          const attributes = scriptAssetPreloadAttributes(script, {
            baseUrl,
          });

          return <link key={script.source} {...(attributes as any)} />;
        })}

      {children}
    </>
  );
}

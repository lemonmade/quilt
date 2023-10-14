/* eslint react/no-unknown-property: off */

import {type State} from '../../manager.ts';
import {Serialize} from './Serialize.tsx';

export interface HeadProps
  extends Pick<
    State,
    'title' | 'metas' | 'scripts' | 'serializations' | 'links'
  > {}

// Fine for server rendering
/* eslint-disable react/no-array-index-key */

export function Head({
  title,
  metas,
  scripts,
  serializations,
  links,
}: HeadProps) {
  const titleContent = title ? <title>{title}</title> : null;

  const metaContent = metas.map((metaProps, index) => (
    <meta key={index} {...metaProps} />
  ));

  const linkContent = links.map((linkProps, index) => (
    <link key={index} {...linkProps} />
  ));

  const scriptContent = scripts.map((scriptProps, index) => (
    <script key={index} {...scriptProps} />
  ));

  const serializationContent = [...serializations].map(([id, data]) => (
    <Serialize key={id} id={id} data={data} />
  ));

  return (
    <>
      {titleContent}
      {metaContent}
      {serializationContent}

      {scriptContent}

      {linkContent}
    </>
  );
}

/* eslint-enable react/no-array-index-key */

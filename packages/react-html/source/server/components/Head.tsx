import {type State} from '../../manager.ts';
import {Serialize} from './Serialize.tsx';

export interface HeadProps
  extends Pick<
    State,
    'title' | 'metas' | 'scripts' | 'serializations' | 'links'
  > {}

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

import {type RenderableProps, type VNode, type JSX} from 'preact';

import {useBrowserResponse} from '../hooks/browser-response.ts';

import {
  HTMLPlaceholderContent,
  HTMLPlaceholderAsyncAssets,
  HTMLPlaceholderEntryAssets,
  HTMLPlaceholderPreloadAssets,
  HTMLPlaceholderSerializations,
} from './HTMLPlaceholder.tsx';

export interface HTMLTemplateProps
  extends Omit<JSX.HTMLAttributes<HTMLHtmlElement>, 'title'>,
    Pick<HTMLTemplateHeadProps, 'title' | 'links' | 'metas'> {
  head?: VNode<any>;
  body?: VNode<any>;
}

export function HTMLTemplate({
  head,
  title,
  links,
  metas,
  body,
  children,
  ...rest
}: RenderableProps<HTMLTemplateProps>) {
  const browserResponse = useBrowserResponse({optional: true});

  return (
    <html {...browserResponse?.htmlAttributes.value} {...rest}>
      {head ?? <HTMLTemplateHead title={title} links={links} metas={metas} />}
      {body ?? (
        <HTMLTemplateBody wrapper={!Boolean(children)}>
          {children}
        </HTMLTemplateBody>
      )}
    </html>
  );
}

export interface HTMLTemplateHeadProps
  extends JSX.HTMLAttributes<HTMLHeadElement> {
  title?: string;
  links?: JSX.LinkHTMLAttributes<HTMLLinkElement>[];
  metas?: JSX.MetaHTMLAttributes<HTMLMetaElement>[];
}

export function HTMLTemplateHead({
  title,
  links,
  metas,
  children,
  ...rest
}: RenderableProps<HTMLTemplateHeadProps>) {
  const browserResponse = useBrowserResponse({optional: true});

  const content = children ?? (
    <>
      <title>{title ?? browserResponse?.title.value}</title>
      {(links ?? browserResponse?.links.value)?.map((link) => (
        <link {...(link as any)} />
      ))}
      {(metas ?? browserResponse?.metas.value)?.map((meta) => (
        <meta {...(meta as any)} />
      ))}
    </>
  );

  return <head {...rest}>{content}</head>;
}

const DEFAULT_WRAPPER_PROPS = {id: 'app'};

export interface HTMLTemplateBodyProps
  extends JSX.HTMLAttributes<HTMLBodyElement> {
  wrapper?: boolean | JSX.HTMLAttributes<HTMLDivElement>;
}

export function HTMLTemplateBody({
  children,
  wrapper = true,
  ...rest
}: RenderableProps<HTMLTemplateBodyProps>) {
  const browserResponse = useBrowserResponse();

  const content = wrapper ? (
    <div {...(typeof wrapper === 'boolean' ? DEFAULT_WRAPPER_PROPS : wrapper)}>
      <HTMLPlaceholderContent />
    </div>
  ) : (
    <HTMLPlaceholderContent />
  );

  const bodyContent = children ?? (
    <>
      <HTMLPlaceholderSerializations />
      <HTMLPlaceholderEntryAssets />

      {content}

      <HTMLPlaceholderAsyncAssets />
      <HTMLPlaceholderPreloadAssets />
    </>
  );

  return (
    <body {...browserResponse.bodyAttributes.value} {...rest}>
      {bodyContent}
    </body>
  );
}

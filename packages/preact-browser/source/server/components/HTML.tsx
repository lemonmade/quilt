import {type RenderableProps, type VNode, type JSX} from 'preact';

import {useBrowserResponse} from '../hooks/browser-response.ts';

import {
  HTMLPlaceholderContent,
  HTMLPlaceholderAsyncAssets,
  HTMLPlaceholderEntryAssets,
  HTMLPlaceholderPreloadAssets,
  HTMLPlaceholderSerializations,
} from './HTMLPlaceholder.tsx';

export interface HTMLProps extends JSX.HTMLAttributes<HTMLHtmlElement> {
  head?: VNode<any>;
  title?: string;
  links?: JSX.HTMLAttributes<HTMLAnchorElement>[];
  metas?: JSX.HTMLAttributes<HTMLMetaElement>[];
  body?: VNode<any>;
}

export function HTML({
  head,
  title,
  links,
  metas,
  body,
  children,
  ...rest
}: RenderableProps<HTMLProps>) {
  const browserResponse = useBrowserResponse({optional: true});

  return (
    <html {...browserResponse?.htmlAttributes.value} {...rest}>
      {head ?? <HTMLHead title={title} links={links} metas={metas} />}
      {body ?? <HTMLBody>{children}</HTMLBody>}
    </html>
  );
}

export interface HTMLHeadProps extends JSX.HTMLAttributes<HTMLHeadElement> {
  title?: string;
  links?: JSX.HTMLAttributes<HTMLAnchorElement>[];
  metas?: JSX.HTMLAttributes<HTMLMetaElement>[];
}

export function HTMLHead({
  title,
  links,
  metas,
  children,
  ...rest
}: RenderableProps<HTMLHeadProps>) {
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

const DEFAULT_APP_ID = 'app';

export interface HTMLBodyProps extends JSX.HTMLAttributes<HTMLBodyElement> {
  app?: {id: string};
}

export function HTMLBody({
  children,
  app,
  ...rest
}: RenderableProps<HTMLBodyProps>) {
  const browserResponse = useBrowserResponse();

  const content = children ?? (
    <>
      <HTMLPlaceholderSerializations />
      <HTMLPlaceholderEntryAssets />

      <div id={app?.id ?? DEFAULT_APP_ID}>
        <HTMLPlaceholderContent />
      </div>

      <HTMLPlaceholderAsyncAssets />
      <HTMLPlaceholderPreloadAssets />
    </>
  );

  return (
    <body {...browserResponse.bodyAttributes.value} {...rest}>
      {content}
    </body>
  );
}

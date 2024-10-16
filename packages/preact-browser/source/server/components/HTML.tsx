import {type RenderableProps, type VNode, type JSX} from 'preact';

import {useBrowserResponse} from '../hooks/browser-response.ts';

import {
  ResponsePlaceholderContent,
  ResponsePlaceholderAsyncAssets,
  ResponsePlaceholderEntryAssets,
  ResponsePlaceholderSerializations,
} from './ResponsePlaceholder.tsx';

export interface HTMLProps extends JSX.HTMLAttributes<HTMLHtmlElement> {
  head?: VNode<any>;
  body?: VNode<any>;
}

export function HTML({
  head,
  body,
  children,
  ...rest
}: RenderableProps<HTMLProps>) {
  const browserResponse = useBrowserResponse();

  return (
    <html {...browserResponse.htmlAttributes.value} {...rest}>
      {head ?? <HTMLHead />}
      {body ?? <HTMLBody>{children}</HTMLBody>}
    </html>
  );
}

export interface HTMLHeadProps {}

export function HTMLHead(_: HTMLHeadProps) {
  const browserResponse = useBrowserResponse();

  return (
    <head>
      <title>{browserResponse.title.value}</title>
      {browserResponse.links.value.map((link) => (
        <link {...(link as any)} />
      ))}
      {browserResponse.metas.value.map((meta) => (
        <meta {...(meta as any)} />
      ))}
    </head>
  );
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
      <ResponsePlaceholderSerializations />
      <ResponsePlaceholderEntryAssets />

      <div id={app?.id ?? DEFAULT_APP_ID}>
        <ResponsePlaceholderContent />
      </div>

      <ResponsePlaceholderAsyncAssets />
    </>
  );

  return (
    <body {...browserResponse.bodyAttributes.value} {...rest}>
      {content}
    </body>
  );
}

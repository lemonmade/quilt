import {type RenderableProps, type VNode, type JSX} from 'preact';

import {useBrowserResponse} from '../hooks/browser-response.ts';

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
      {body ?? <HTMLTemplateBody>{children}</HTMLTemplateBody>}
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
      {/*
        Serializations and asset placeholders default into <head>, not <body>,
        for two reasons:

        1. Stylesheet links work most reliably as render-blocking when they're
           in <head>. Body-positioned `<link rel=stylesheet>` (even with
           `blocking="render"`) can flash unstyled content in Safari when
           there's any preceding body content the parser has already started
           to commit. Putting them in <head> sidesteps that entirely.
        2. The HTTP `Link: rel=preload` headers `renderAppToHTMLResponse`
           emits for entry assets are most useful when the corresponding
           `<link>` tags are also in <head>; the preload scanner picks them
           up before any body content streams in.

        The order — serializations, then entry assets, then async, then
        preload — matches what `HTMLTemplateBody` used to render so existing
        behavior around hydration timing and `browser.assets` discovery is
        preserved.
      */}
      <HTMLTemplateSerializations />
      <HTMLTemplateAssets />
      <HTMLTemplateAssets async />
      <HTMLTemplateAssets preload />
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
  wrapper = !Boolean(children),
  ...rest
}: RenderableProps<HTMLTemplateBodyProps>) {
  const browserResponse = useBrowserResponse();

  // Serializations and asset placeholders moved to `HTMLTemplateHead`;
  // see the comment there. The body now defaults to just the wrapper +
  // content placeholder.
  const bodyContent =
    children ??
    (wrapper ? (
      <div
        {...(typeof wrapper === 'boolean' ? DEFAULT_WRAPPER_PROPS : wrapper)}
      >
        <HTMLTemplateContent />
      </div>
    ) : (
      <HTMLTemplateContent />
    ));

  return (
    <body {...browserResponse.bodyAttributes.value} {...rest}>
      {bodyContent}
    </body>
  );
}

export function HTMLTemplateContent() {
  // @ts-expect-error Just used as a placeholder
  return <html-template-placeholder-content />;
}

export function HTMLTemplateAssets({
  name,
  async,
  preload,
}:
  | {name?: string; async?: never; preload?: never}
  | {name?: string; async?: boolean | string; preload?: never}
  | {name?: never; async?: never; preload?: boolean}) {
  const props: Record<string, string> = {};

  if (name) {
    props.name = name;
  }

  if (async) {
    props.async = typeof async === 'string' ? async : '';
  }

  if (preload) {
    props.preload = '';
  }

  // @ts-expect-error Just used as a placeholder
  return <html-template-placeholder-assets {...props} />;
}

export function HTMLTemplateSerializations() {
  // @ts-expect-error Just used as a placeholder
  return <html-template-placeholder-serializations />;
}

export function HTMLTemplateStreamBoundary() {
  // @ts-expect-error Just used as a placeholder
  return <html-template-stream-boundary />;
}

HTMLTemplate.Head = HTMLTemplateHead;
HTMLTemplate.Body = HTMLTemplateBody;
HTMLTemplate.Content = HTMLTemplateContent;
HTMLTemplate.Assets = HTMLTemplateAssets;
HTMLTemplate.Serializations = HTMLTemplateSerializations;
HTMLTemplate.StreamBoundary = HTMLTemplateStreamBoundary;

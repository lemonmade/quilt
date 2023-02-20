import type {ComponentProps, PropsWithChildren, ReactNode} from 'react';

import {HttpContext, CookieContext} from '@quilted/react-http';
import {useHtmlUpdater} from '@quilted/react-html';
import {Routing, type Routes, type Router} from '@quilted/react-router';
import {PerformanceContext, type Performance} from '@quilted/react-performance';
import {Localization} from '@quilted/react-localize';

interface Props {
  /**
   * A React element that adds global HTTP headers to the page. Alternatively, you
   * can pass `false` to disable Quilt’s HTTP-related features.
   *
   * @see https://github.com/lemonmade/quilt/blob/main/documentation/features/http.md
   */
  http?: boolean | ReactNode;

  /**
   * A React element that add adjusts the HTML document, like adding global `head`
   * elements to the page or customizing the `html` and `body` elements. Alternatively,
   * you can pass `false` to disable Quilt’s HTML-related features.
   *
   * @see https://github.com/lemonmade/quilt/blob/main/documentation/features/html.md
   */
  html?: boolean | ReactNode;

  /**
   * Routes for your application. You can use this prop when you have a static set of routes
   * that do not depend on any React context. If you do need dynamic routes, you will need to
   * remove this prop, and instead use the `useRoutes()` hook from this library in a child
   * component.
   */
  routes?: Routes;

  /**
   * Customizes how routing is performed in this application. You can pass a `Router`
   * object, or the props of the `<Routing />` component from Quilt, which will be passed through
   * to that component. Alternatively, you can pass `false` to disable Quilt’s routing features.
   */
  routing?:
    | boolean
    | Router
    | Pick<
        ComponentProps<typeof Routing>,
        'isExternal' | 'prefix' | 'state' | 'url'
      >;

  /**
   * Customizes how localization is performed in this application. You can pass a string
   * to set the locale of the app directly, or an object with the props of the `<Localization />`
   * component. Alternatively, you can pass `false` to disable Quilt’s localization features.
   */
  localization?:
    | boolean
    | string
    | Pick<ComponentProps<typeof Localization>, 'locale'>;

  /**
   * Customizes how performance tracking works in this application. You can pass a `Performance`
   * object, or `false` to disable Quilt’s performance features.
   */
  performance?: boolean | Performance;
}

// TODO: have craft options to remove the bundle impact of parts of this that are
// unused.
export function QuiltApp({
  http = true,
  html = true,
  routes,
  routing = true,
  localization = true,
  children,
  performance = true,
}: PropsWithChildren<Props>) {
  const htmlContent =
    typeof html === 'boolean' ? (
      html ? (
        <HtmlUpdater />
      ) : null
    ) : (
      <>
        <HtmlUpdater />
        {html}
      </>
    );

  const httpContent = typeof http === 'boolean' ? null : http;

  const content = (
    <>
      {httpContent}
      {htmlContent}
      {children}
    </>
  );

  const withMaybeRouting =
    typeof routing === 'boolean' ? (
      routing ? (
        <Routing routes={routes}>{content}</Routing>
      ) : (
        content
      )
    ) : 'navigate' in routing ? (
      <Routing routes={routes} router={routing}>
        {content}
      </Routing>
    ) : (
      <Routing routes={routes} {...routing}>
        {content}
      </Routing>
    );

  const withMaybePerformance =
    typeof performance === 'boolean' ? (
      performance ? (
        <PerformanceContext>{withMaybeRouting}</PerformanceContext>
      ) : (
        withMaybeRouting
      )
    ) : (
      <PerformanceContext performance={performance}>
        {withMaybeRouting}
      </PerformanceContext>
    );

  const withMaybeHttp =
    typeof http === 'boolean' ? (
      http ? (
        <HttpContext>
          <CookieContext>{withMaybePerformance}</CookieContext>
        </HttpContext>
      ) : (
        withMaybePerformance
      )
    ) : (
      <HttpContext>
        <CookieContext>{withMaybePerformance}</CookieContext>
      </HttpContext>
    );

  const withMaybeLocalization =
    typeof localization === 'boolean' ? (
      localization ? (
        <Localization locale="en">{withMaybeHttp}</Localization>
      ) : (
        withMaybeHttp
      )
    ) : typeof localization === 'string' ? (
      <Localization locale={localization}>{withMaybeHttp}</Localization>
    ) : (
      <Localization {...localization}>{withMaybeHttp}</Localization>
    );

  return withMaybeLocalization;
}

function HtmlUpdater() {
  useHtmlUpdater();
  return null;
}

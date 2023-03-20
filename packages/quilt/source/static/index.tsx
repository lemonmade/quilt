import {Fragment, type ComponentType} from 'react';

import {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  type BrowserAssets,
} from '@quilted/assets';
import {renderHtmlToString, Html} from '@quilted/react-html/server';
import type {RouteDefinition} from '@quilted/react-router';
import {
  StaticRenderer,
  StaticRendererContext,
} from '@quilted/react-router/static';
import type {HttpState} from '@quilted/react-http/server';

import {renderApp} from './render';

export interface RenderDetails {
  readonly route: string;
  readonly hasChildren: boolean;
  readonly fallback: boolean;
  readonly content: string;
  readonly http: HttpState;
}

interface RenderableRoute {
  route: string;
  fallback: boolean;
}

export interface Options {
  routes: string[];
  assets: BrowserAssets<any>;
  crawl?: boolean;
  baseUrl?: string;
  prettify?: boolean;
  onRender(details: RenderDetails): void | Promise<void>;
}

const BASE_URL = 'http://localhost:3000';

export async function renderStatic(
  App: ComponentType<any>,
  {
    assets,
    routes: startingRoutes,
    onRender,
    crawl = true,
    baseUrl = BASE_URL,
    prettify = true,
  }: Options,
) {
  const routesToHandle = startingRoutes.map<RenderableRoute>((route) => ({
    route: removePostfixSlash(new URL(route, baseUrl).pathname),
    fallback: false,
  }));
  const seenRoutes = [...routesToHandle];
  const seenRouteIds = new Set<string>(seenRoutes.map(({route}) => route));

  let renderableRoute: RenderableRoute | undefined;

  while ((renderableRoute = routesToHandle.shift())) {
    const {route, fallback} = renderableRoute;

    const url = new URL(route, baseUrl);

    const {html, http, routes} = await renderUrl(url, {fallback});

    if (crawl) {
      for (const {
        routes: routeDefinitions,
        fallback = false,
        consumedPath,
        prefix,
      } of routes) {
        const basePathname = joinPath(prefix, consumedPath);
        const baseId =
          basePathname === '/'
            ? basePathname
            : `__QUILT_BASE_${basePathname}__`;

        for (const routeDefinition of routeDefinitions) {
          await recordRouteDefinition(routeDefinition, {
            baseId,
            basePathname,
            addFallbacks: fallback,
          });
        }

        if (
          fallback &&
          routeDefinitions[routeDefinitions.length - 1]?.match != null
        ) {
          await recordRouteDefinition(
            {},
            {
              baseId,
              basePathname,
              addFallbacks: fallback,
            },
          );
        }
      }
    }

    await onRender({
      route,
      content: html,
      http,
      fallback,
      hasChildren:
        !fallback &&
        seenRoutes.some((otherRoute) =>
          otherRoute.route.startsWith(`${route}/`),
        ),
    });
  }

  async function recordRouteDefinition(
    {match, children, renderStatic}: RouteDefinition,
    {
      basePathname,
      baseId,
      addFallbacks,
    }: {basePathname: string; baseId: string; addFallbacks: boolean},
  ) {
    if (renderStatic === false) return;

    let routeId: string;
    const hasChildren = children && children.length > 0;
    const hasManualMatches =
      typeof renderStatic === 'function' && typeof match !== 'string';

    const matchedRoutes: {id: string; route: string; fallback: boolean}[] = [];

    if (typeof match === 'string') {
      routeId = joinPath(baseId, match);
      matchedRoutes.push({
        id: routeId,
        route: joinPath(basePathname, match),
        fallback: false,
      });
    } else if (typeof match === 'function') {
      routeId = joinPath(
        baseId,
        `__QUILT_FUNCTION_ROUTE_${match.toString()}__`,
      );
    } else if (match instanceof RegExp) {
      routeId = joinPath(`__QUILT_REGEX_ROUTE_${match.source}__`);
    } else {
      routeId = joinPath(baseId, '__QUILT_FALLBACK_ROUTE__');

      if (!hasManualMatches) {
        matchedRoutes.push({id: routeId, route: basePathname, fallback: true});
      }
    }

    if (seenRouteIds.has(routeId)) return;
    seenRouteIds.add(routeId);

    if (typeof renderStatic === 'function' && typeof match !== 'string') {
      const matchedRouteParts = await renderStatic();

      for (const routePart of matchedRouteParts) {
        const id = joinPath(baseId, `__QUILT_MATCH_${routePart}__`);
        seenRouteIds.add(id);

        matchedRoutes.push({
          id,
          route: joinPath(basePathname, routePart),
          fallback: false,
        });
      }
    }

    if (hasChildren) {
      for (const {id, route} of matchedRoutes) {
        for (const child of children!) {
          await recordRouteDefinition(child, {
            addFallbacks,
            basePathname: route,
            baseId: id,
          });
        }

        if (addFallbacks && children![children!.length - 1]?.match != null) {
          await recordRouteDefinition(
            {},
            {
              addFallbacks,
              basePathname: route,
              baseId: id,
            },
          );
        }
      }

      return;
    }

    for (const {route, fallback} of matchedRoutes) {
      const renderableRoute = {route, fallback};
      seenRoutes.push(renderableRoute);
      routesToHandle.push(renderableRoute);
    }
  }

  async function renderUrl(url: URL, {fallback = false} = {}) {
    const routeRecorder = new StaticRenderer({
      forceFallback: fallback ? url.pathname : undefined,
    });

    const initialCacheKey = await assets.cacheKey?.(new Request(url));

    const {
      http,
      html: htmlManager,
      assets: assetsManager,
      markup,
    } = await renderApp(<App />, {
      url,
      cacheKey: initialCacheKey,
      decorate(app) {
        return (
          <StaticRendererContext.Provider value={routeRecorder}>
            {app}
          </StaticRendererContext.Provider>
        );
      },
    });

    const cacheKey = assetsManager.cacheKey;

    const [mainAssets, preloadAssets] = await Promise.all([
      assets.entry({
        modules: assetsManager.usedModules({timing: 'load'}),
        cacheKey,
      }),
      assets.modules(assetsManager.usedModules({timing: 'preload'}), {
        cacheKey,
      }),
    ]);

    const minifiedHtml = renderHtmlToString(
      <Html
        manager={htmlManager}
        headEndContent={
          <>
            {[...mainAssets.styles].map((style) => {
              const attributes = styleAssetAttributes(style, {baseUrl: url});
              return <link key={style.source} {...(attributes as any)} />;
            })}

            {[...mainAssets.scripts].map((script) => {
              const attributes = scriptAssetAttributes(script, {
                baseUrl: url,
              });

              return attributes.type === 'module' ? (
                <Fragment key={script.source}>
                  <link {...(scriptAssetPreloadAttributes(script) as any)} />
                  <script {...(attributes as any)} />
                </Fragment>
              ) : (
                <script key={script.source} {...(attributes as any)} />
              );
            })}

            {[...preloadAssets.styles].map((style) => {
              const attributes = styleAssetPreloadAttributes(style, {
                baseUrl: url,
              });

              return <link key={style.source} {...(attributes as any)} />;
            })}

            {[...preloadAssets.scripts].map((script) => {
              const attributes = scriptAssetPreloadAttributes(script, {
                baseUrl: url,
              });

              return <link key={script.source} {...(attributes as any)} />;
            })}
          </>
        }
      >
        {markup}
      </Html>,
    );

    const html = prettify ? await prettifyHtml(minifiedHtml) : minifiedHtml;

    return {
      html,
      http: http.state,
      routes: routeRecorder.state,
    };
  }
}

async function prettifyHtml(html: string) {
  try {
    const {default: prettier} = await import('prettier');
    return prettier.format(html, {parser: 'html'});
  } catch (error) {
    return html;
  }
}

function joinPath(...parts: (string | undefined | null | false)[]) {
  let path = '/';

  for (const part of parts) {
    if (typeof part !== 'string') continue;
    const normalizedPart = part.startsWith('/') ? part.slice(1) : part;
    if (normalizedPart.length === 0) continue;
    if (path !== '/') path += '/';
    path += normalizedPart;
    path = removePostfixSlash(path);
  }

  return path;
}

function removePostfixSlash(value: string) {
  return value.endsWith('/') && value !== '/'
    ? value.slice(0, value.length - 1)
    : value;
}

import type {ComponentType} from 'react';

import type {AssetLoader} from '@quilted/async/server';
import {render, Html} from '@quilted/react-html/server';
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
  assets: AssetLoader<{modules: boolean}>;
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
      for (const {routes: routeDefinitions, consumedPath, prefix} of routes) {
        const basePathname = joinPath(prefix, consumedPath);

        for (const routeDefinition of routeDefinitions) {
          await recordRouteDefinition(routeDefinition, basePathname);
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
    basePathname: string,
  ) {
    if (renderStatic === false) return;

    let routeId: string;
    let ownRoute: string | undefined;
    const hasChildren = children && children.length > 0;
    const fallback = match == null;
    const routes: string[] = [];

    if (typeof match === 'string') {
      ownRoute = joinPath(basePathname, match);
      routes.push(ownRoute);
      routeId = ownRoute;
    } else if (typeof match === 'function') {
      routeId = joinPath(
        basePathname,
        `__QUILT_FUNCTION_ROUTE_${match.toString()}__`,
      );
    } else if (match instanceof RegExp) {
      routeId = joinPath(basePathname, `__QUILT_REGEX_ROUTE_${match.source}__`);
    } else {
      ownRoute = basePathname;
      routeId = joinPath(basePathname, '__QUILT_FALLBACK_ROUTE__');
    }

    if (seenRouteIds.has(routeId)) return;

    if (ownRoute !== basePathname) {
      seenRouteIds.add(routeId);
    }

    if (routes.length === 0 && typeof renderStatic === 'function') {
      const additionalPathParts = await renderStatic();

      for (const route of additionalPathParts.map((part) =>
        joinPath(basePathname, part),
      )) {
        routes.push(route);
      }
    }

    if (hasChildren) {
      for (const route of routes) {
        for (const child of children!) {
          await recordRouteDefinition(child, route);
        }
      }

      return;
    }

    if (ownRoute == null) return;

    const renderableRoute = {route: ownRoute, fallback};

    seenRouteIds.add(routeId);
    seenRoutes.push(renderableRoute);
    routesToHandle.push(renderableRoute);
  }

  async function renderUrl(url: URL, {fallback = false} = {}) {
    const routeRecorder = new StaticRenderer({
      forceFallback: fallback ? url.pathname : undefined,
    });

    const {
      http,
      html: htmlManager,
      markup,
      asyncAssets,
    } = await renderApp(<App />, {
      url,
      decorate(app) {
        return (
          <StaticRendererContext.Provider value={routeRecorder}>
            {app}
          </StaticRendererContext.Provider>
        );
      },
    });

    const usedAssets = asyncAssets.used({timing: 'load'});

    const [
      moduleStyles,
      moduleScripts,
      modulePreload,
      nomoduleStyles,
      nomoduleScripts,
    ] = await Promise.all([
      assets.styles({async: usedAssets, options: {modules: true}}),
      assets.scripts({async: usedAssets, options: {modules: true}}),
      assets.asyncAssets(asyncAssets.used({timing: 'preload'}), {
        options: {modules: true},
      }),
      assets.styles({async: usedAssets, options: {modules: false}}),
      assets.scripts({async: usedAssets, options: {modules: false}}),
    ]);

    // We don’t want to load styles from both bundles, so we only use module styles,
    // since modules are intended to be the default and CSS (usually) doesn’t
    // have features that meaningfully break older user agents.
    const styles = moduleStyles.length > 0 ? moduleStyles : nomoduleStyles;

    // If there are nomodule scripts, we can’t really do preloading, because we can’t
    // prevent the nomodule scripts from being preloaded in module browsers. If there
    // are only module scripts, we can preload those.
    const preload = nomoduleScripts.length > 0 ? [] : modulePreload;

    const scripts = [
      ...moduleScripts,
      ...nomoduleScripts.map((script) => ({...script, nomodule: true})),
    ];

    const minifiedHtml = render(
      <Html
        manager={htmlManager}
        styles={styles}
        scripts={scripts}
        preloadAssets={preload}
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
  } catch {
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

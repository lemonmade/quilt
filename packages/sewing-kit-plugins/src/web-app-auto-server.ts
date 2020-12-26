import {extname} from 'path';
import {
  createProjectPlugin,
  WebApp,
  TargetBuilder,
  TargetRuntime,
  Runtime,
  WaterfallHook,
  addHooks,
} from '@sewing-kit/plugins';
import type {compilation} from 'webpack';

import {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_AUTO_SERVER_ASSETS,
} from './constants';

interface TargetOptions {
  readonly quiltAutoServer?: true;
}

interface CustomHooks {
  readonly quiltAutoServerContent: WaterfallHook<string | undefined>;
  readonly quiltAutoServerPort: WaterfallHook<number>;
  readonly quiltAutoServerHost: WaterfallHook<string>;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppTargetOptions extends TargetOptions {}
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
}

export function webAppAutoServer() {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppAutoServer',
    ({project, tasks, api}) => {
      const addCustomHooks = addHooks<CustomHooks>(() => ({
        quiltAutoServerContent: new WaterfallHook(),
        quiltAutoServerPort: new WaterfallHook(),
        quiltAutoServerHost: new WaterfallHook(),
      }));

      tasks.dev.hook(({hooks}) => {
        hooks.configureHooks.hook(addCustomHooks);

        hooks.steps.hook((steps, configuration) => [
          ...steps,
          api.createStep(
            {
              label: 'starting stating HTML development server',
              id: 'StaticHtml.DevServer',
            },
            async (step) => {
              step.indefinite(async ({stdio}) => {
                const [{createServer}, {URL}] = await Promise.all([
                  import('http'),
                  import('url'),
                ]);

                const [
                  port,
                  host,
                  webpackPublicPath,
                  webpackOutputFilename,
                ] = await Promise.all([
                  configuration.quiltAutoServerPort!.run(3003),
                  configuration.quiltAutoServerHost!.run('localhost'),
                  configuration.webpackPublicPath!.run('/'),
                  configuration.webpackOutputFilename!.run('main.js'),
                ]);

                createServer((req, res) => {
                  stdio.stdout.write(`request for path: ${req.url}\n`);

                  res.writeHead(200, {
                    'Content-Type': 'text/html',
                    // 'Content-Security-Policy':
                    //   "default-src http://* https://* 'unsafe-eval'",
                  });

                  res.write(
                    `<html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, height=device-height, user-scalable=0">
                        </head>
                        <body>
                          <div id="app"></div>
                          <script src=${JSON.stringify(
                            new URL(webpackOutputFilename, webpackPublicPath)
                              .href,
                          )}></script>
                        </body>
                      </html>`,
                  );
                  res.end();
                }).listen(port, host, () => {
                  step.log(`App server listening on ${host}:${port}`);
                });
              });
            },
          ),
        ]);
      });

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addCustomHooks);

        hooks.targets.hook((targets) => [
          ...targets,
          new TargetBuilder({
            project,
            options: [{quiltAutoServer: true}],
            runtime: new TargetRuntime([Runtime.Node]),
            needs: targets.filter((target) => target.default),
          }),
        ]);

        hooks.target.hook(({target, hooks, context}) => {
          if (!target.options.quiltAutoServer) return;

          hooks.configure.hook((configuration) => {
            const entry = api.tmpPath(`quilt/${project.name}-auto-server.js`);
            const assetsPath = api.tmpPath(
              `quilt/${project.name}-auto-server-assets.js`,
            );

            configuration.webpackOutputFilename?.hook(() => 'index.js');

            configuration.webpackEntries?.hook(() => [entry]);

            configuration.webpackAliases?.hook((aliases) => ({
              ...aliases,
              [MAGIC_MODULE_APP_AUTO_SERVER_ASSETS]: assetsPath,
            }));

            configuration.webpackPlugins?.hook(async (plugins) => {
              const {default: WebpackVirtualModules} = await import(
                'webpack-virtual-modules'
              );

              const [stats] = [...context.project.webpackStats!.values()];
              const entrypoints = entrypointFromCompilation(stats.compilation);

              let serverEntrySource = await configuration.quiltAutoServerContent!.run(
                undefined,
              );

              if (!serverEntrySource) {
                const [port, host] = await Promise.all([
                  configuration.quiltAutoServerPort!.run(3003),
                  configuration.quiltAutoServerHost!.run('localhost'),
                ]);

                serverEntrySource = `
                  import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
                  import assets from ${JSON.stringify(
                    MAGIC_MODULE_APP_AUTO_SERVER_ASSETS,
                  )};
  
                  import {createServer} from 'http';
  
                  import React from 'react';
                  import {render, runApp, Html} from '@quilted/quilt/server';
  
                  process.on('uncaughtException', (...args) => {
                    console.error(...args);
                  });
  
                  console.log('Creating server: http://${host}:${port}');
                  
                  createServer(async (request, response) => {
                    const {html, http, markup, asyncAssets} = await runApp(<App />, {
                      url: new URL(request.path, 'http://' + request.host),
                    });
                  
                    const {headers, statusCode = 200} = http.state;
                  
                    console.log(event);
                  
                    const [styles, scripts] = await Promise.all([
                      assets.styles(),
                      assets.scripts(),
                    ]);
  
                    response.writeHead(
                      statusCode,
                      [...headers].reduce((allHeaders, [key, value]) => {
                        allHeaders[key] = value;
                        return allHeaders;
                      }, {}),
                    );
  
                    response.write(
                      render(
                        <Html manager={html} styles={styles} scripts={scripts} preloadAssets={[]}>
                          {markup}
                        </Html>,
                      ),
                    );
  
                    response.end();
                  }).listen(${port}, ${JSON.stringify(host)});
                `;
              }

              return [
                ...plugins,
                new WebpackVirtualModules({
                  [assetsPath]: `
                    const entrypoints = ${JSON.stringify(entrypoints)};
                    const assets = {
                      styles() {
                        return Promise.resolve(entrypoints.main.css);
                      },
                      scripts() {
                        return Promise.resolve(entrypoints.main.js);
                      },
                    };
  
                    export default assets;
                  `,
                  [entry]: serverEntrySource,
                }),
              ];
            });
          });
        });
      });
    },
  );
}

function entrypointFromCompilation(compilation: compilation.Compilation) {
  return [...compilation.entrypoints.keys()].reduce<{
    [key: string]: Entrypoint;
  }>(
    (entries, name) => ({
      ...entries,
      [name]: getChunkDependencies(compilation, name),
    }),
    {},
  );
}

interface Chunk {
  path: string;
  integrity?: string;
}

interface Entrypoint {
  js: Chunk[];
  css: Chunk[];
}

interface AsyncManifestEntry {
  path: string;
  integrity?: string;
}

interface AsyncManifest {
  [key: string]: AsyncManifestEntry[];
}

interface AssetVariant {
  [key: string]: any;
}

export interface AssetManifest {
  id: string;
  variant: AssetVariant;
  version: string;
  entrypoints: {[key: string]: Entrypoint};
  asyncAssets: AsyncManifest;
}

// Supported algorithms listed in the spec: https://w3c.github.io/webappsec-subresource-integrity/#hash-functions
export const SRI_HASH_ALGORITHMS = ['sha256', 'sha384', 'sha512'];

function calculateBase64IntegrityFromFilename(
  path: string,
  hashFunction: string,
  hashDigest: string,
): string | false {
  if (!isHashAlgorithmSupportedByBrowsers(hashFunction)) {
    return false;
  }
  if (hashDigest && hashDigest !== 'hex') {
    return false;
  }

  const chunkInfo =
    // Anything ending in a hyphen + hex string (e.g., `foo-00000000.js`).
    path.match(/.+?-(?:([a-f0-9]+))?\.[^.]+$/) ||
    // Unnamed dynamic imports like `00000000.js`.
    path.match(/^([a-f0-9]+)\.[^.]+$/);

  if (!chunkInfo || !chunkInfo[1]) {
    return false;
  }

  const hexHash = chunkInfo[1];
  const base64Hash = Buffer.from(hexHash, 'hex').toString('base64');
  return `${hashFunction}-${base64Hash}`;
}

function isHashAlgorithmSupportedByBrowsers(hashFunction: string) {
  return SRI_HASH_ALGORITHMS.includes(hashFunction);
}

function getChunkDependencies(
  {entrypoints, outputOptions}: compilation.Compilation,
  entryName: string,
): Entrypoint {
  const {publicPath = '', hashFunction, hashDigest} = outputOptions;
  const dependencyChunks: string[] = entrypoints.get(entryName).chunks;
  const allChunkFiles = dependencyChunks.reduce(
    (allFiles: string[], depChunk: any) => [...allFiles, ...depChunk.files],
    [],
  );

  const dependencies: Entrypoint = {css: [], js: []};
  allChunkFiles.forEach((path) => {
    const extension = extname(path).replace('.', '') as keyof Entrypoint;
    if (!(extension in dependencies)) {
      return;
    }

    const integrity = calculateBase64IntegrityFromFilename(
      path,
      hashFunction,
      hashDigest,
    );

    dependencies[extension].push({
      path: `${publicPath}${path}`,
      ...(integrity ? {integrity} : {}),
    });
  });

  return dependencies;
}

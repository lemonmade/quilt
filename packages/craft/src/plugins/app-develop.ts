import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-vite';

export const STEP_NAME = 'Quilt.App.Develop';

export interface Options {
  port?: number;
}

export function appDevelop({port}: Options = {}) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    develop({project, configure}) {
      configure(
        ({
          babelPlugins,
          babelPresets,
          babelExtensions,
          vitePort,
          vitePlugins,
        }) => {
          if (port) vitePort?.(() => port);

          vitePlugins?.(async (plugins) => {
            const [requestedBabelPlugins, requestedBabelPresets] =
              await Promise.all([babelPlugins!.run([]), babelPresets!.run([])]);

            const normalizedBabelPlugins = requestedBabelPlugins.filter(
              (plugin) => !babelConfigItemIs(plugin, '@quilted/async/babel'),
            );

            const normalizedBabelPresets: typeof requestedBabelPresets = [];

            for (const requestedPreset of requestedBabelPresets) {
              // Omit preset-env entirely, Vite handles that with esbuild
              if (babelConfigItemIs(requestedPreset, '@babel/preset-env'))
                continue;

              // Instead of compiling TypeScript away entirely, we will just teach Babel
              // to parse the syntax
              if (
                babelConfigItemIs(requestedPreset, '@babel/preset-typescript')
              ) {
                normalizedBabelPlugins.unshift([
                  '@babel/plugin-syntax-typescript',
                  {isTSX: true},
                ]);
                continue;
              }

              // ESBuild handles the React transform, though it does not currently
              // support the runtime transform.
              if (babelConfigItemIs(requestedPreset, '@babel/preset-react')) {
                continue;
              }

              normalizedBabelPresets.push(requestedPreset);
            }

            if (
              normalizedBabelPresets.length > 0 ||
              normalizedBabelPlugins.length > 0
            ) {
              const extensions = await babelExtensions!.run([
                '.ts',
                '.tsx',
                '.mjs',
                '.js',
              ]);

              plugins.push({
                name: '@quilted/babel-preprocess',
                enforce: 'pre',
                async transform(code, id) {
                  if (!extensions.some((ext) => id.endsWith(ext))) {
                    return null;
                  }

                  const {transformAsync} = await import('@babel/core');

                  const {code: transformedCode, map} =
                    (await transformAsync(code, {
                      filename: id,
                      babelrc: false,
                      configFile: false,
                      presets: normalizedBabelPresets,
                      plugins: normalizedBabelPlugins,
                    })) ?? {};

                  return {code: transformedCode ?? undefined, map};
                },
              });
            }

            plugins.push({
              name: '@quilted/magic/browser',
              resolveId(id) {
                if (id === '/@quilted/magic/browser.tsx') {
                  return id;
                }

                return null;
              },
              async load(id) {
                if (id === '/@quilted/magic/browser.tsx') {
                  return stripIndent`
                    import {render} from 'react-dom';
                    import App from ${JSON.stringify(
                      project.fs.resolvePath(project.entry ?? ''),
                    )};

                    render(<App />, document.getElementById('app'));
                  `;
                }
              },
            });

            plugins.push({
              name: '@quilted/server',
              configureServer(server) {
                server.middlewares.use(async (request, response, next) => {
                  try {
                    const accept = request.headers.accept ?? '';
                    if (!accept.includes('text/html')) return next();

                    const url = new URL(
                      `${request.headers['x-forwarded-proto'] ?? 'http'}://${
                        request.headers['x-forwarded-host'] ??
                        request.headers.host
                      }${request.originalUrl}`,
                    );

                    const template = await server.transformIndexHtml(
                      url.href,
                      stripIndent`
                      <html>
                        <body>
                          <div id="app"></div>
                          <script defer src="/@quilted/magic/browser.tsx" type="module"></script>
                        </body>
                      </html>
                    `,
                    );

                    response.setHeader('Content-Type', 'text/html');
                    response.end(template);
                  } catch (error) {
                    server.ssrFixStacktrace(error);
                    next(error);
                  }
                });
              },
            });

            return plugins;
          });
        },
      );
    },
  });
}

function babelConfigItemIs(
  configItem: import('@babel/core').PluginItem,
  compare: string,
) {
  return (
    compare === configItem ||
    (Array.isArray(configItem) && configItem[0] === compare)
  );
}

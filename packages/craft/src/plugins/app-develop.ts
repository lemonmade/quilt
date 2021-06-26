import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-vite';

import {getEntry} from './shared';

export const STEP_NAME = 'Quilt.App.Develop';

export interface Options {
  port?: number;
}

export function appDevelop({port}: Options = {}) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    develop({project, configure}) {
      configure(({vitePort, vitePlugins}) => {
        if (port) vitePort?.(() => port);

        vitePlugins?.((plugins) => {
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
                const appEntry = await getEntry(project);

                return stripIndent`
                  import {render} from 'react-dom';
                  import App from ${JSON.stringify(appEntry)};

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
      });
    },
  });
}

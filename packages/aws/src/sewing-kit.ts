import {createProjectPlugin, WebApp} from '@sewing-kit/plugins';
import {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_AUTO_SERVER_ASSETS,
} from '@quilted/sewing-kit-plugins';

export function aws() {
  return createProjectPlugin<WebApp>('Quilt.Aws', ({tasks}) => {
    tasks.build.hook(({hooks}) => {
      hooks.target.hook(({target, hooks}) => {
        if (!target.options.quiltAutoServer) return;

        hooks.configure.hook(({quiltAutoServerContent}) => {
          quiltAutoServerContent?.hook(
            () => `
              import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
              import assets from ${JSON.stringify(
                MAGIC_MODULE_APP_AUTO_SERVER_ASSETS,
              )};

              import React from 'react';
              import {render, runApp, Html} from '@quilted/quilt/server';

              process.on('uncaughtException', (...args) => {
                console.error(...args);
              });
              
              export async function handler(event) {
                const {html, http, markup, asyncAssets} = await runApp(<App />, {
                  url: new URL(event.rawPath, 'https://' + event.requestContext.domainName),
                });
              
                const {headers, statusCode = 200} = http.state;
              
                console.log(event);
              
                const [styles, scripts] = await Promise.all([
                  assets.styles(),
                  assets.scripts(),
                ]);
              
                return {
                  statusCode,
                  body: render(
                    <Html manager={html} styles={styles} scripts={scripts} preloadAssets={[]}>
                      {markup}
                    </Html>,
                  ),
                  headers: [...headers].reduce((allHeaders, [key, value]) => {
                    allHeaders[key] = value;
                    return allHeaders;
                  }, {}),
                };
              }
            `,
          );
        });
      });
    });
  });
}

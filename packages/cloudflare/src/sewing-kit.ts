import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {
  MAGIC_MODULE_HTTP_HANDLER,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from '@quilted/craft';

export function cloudflareWorkers() {
  return createProjectPlugin<App>({
    name: 'Quilt.Cloudflare.Workers',
    build({configure}) {
      configure(
        (
          {
            rollupOutputs,
            quiltAssetBaseUrl,
            quiltAutoServerContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltAutoServer = false},
        ) => {
          if (!quiltAutoServer) return;

          rollupOutputs?.((outputs) => {
            for (const output of outputs) {
              output.inlineDynamicImports = true;
            }

            return outputs;
          });

          // Unlike most other auto-server/ http-handler uses, the cloudflare version
          // internally uses cloudflare’s service worker-like API as the "handler",
          // and updates the wrapping runtime code accordingly.
          quiltAutoServerContent?.(
            async () => stripIndent`
              import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
              import assets from ${JSON.stringify(
                MAGIC_MODULE_APP_ASSET_MANIFEST,
              )};
              import {createEventHandler} from '@quilted/cloudflare/http-handlers';

              const handler = createEventHandler(App, {assets, assetsPath: ${JSON.stringify(
                await quiltAssetBaseUrl!.run(),
              )}})

              export default handler;
            `,
          );

          quiltHttpHandlerRuntimeContent?.(
            () => stripIndent`
              import handleEvent from ${JSON.stringify(
                MAGIC_MODULE_HTTP_HANDLER,
              )};

              addEventListener('fetch', handleEvent);
            `,
          );
        },
      );
    },
  });
}

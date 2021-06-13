import {extname} from 'path';
import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {
  MAGIC_MODULE_HTTP_HANDLER,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from '@quilted/craft';

export type Format = 'service-worker' | 'modules';

export interface Options {
  format?: Format;
}

export function cloudflareWorkers({format = 'modules'}: Options = {}) {
  return createProjectPlugin<App>({
    name: 'Quilt.Cloudflare.Workers',
    build({configure}) {
      configure(
        (
          {
            rollupOutputs,
            rollupInputOptions,
            quiltAssetBaseUrl,
            quiltAutoServerContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltAutoServer = false},
        ) => {
          if (!quiltAutoServer) return;

          rollupInputOptions?.((options) => {
            // The default entry does not preserve exports, but cloudflare
            // uses the default export as the handler.
            options.preserveEntrySignatures = 'exports-only';
            return options;
          });

          rollupOutputs?.((outputs) => {
            for (const output of outputs) {
              if (format === 'modules') {
                // Cloudflare workers assume .js/.cjs are commonjs by default,
                // if we are using modules we default file names to .mjs so they
                // are automatically interpreted as modules.
                output.entryFileNames = ensureMjsExtension(
                  output.entryFileNames,
                );
                output.chunkFileNames = ensureMjsExtension(
                  output.chunkFileNames,
                );
                output.assetFileNames = ensureMjsExtension(
                  output.assetFileNames,
                );
              }

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

          quiltHttpHandlerRuntimeContent?.(() => {
            if (format === 'service-worker') {
              return stripIndent`
                import handleEvent from ${JSON.stringify(
                  MAGIC_MODULE_HTTP_HANDLER,
                )};
  
                addEventListener('fetch', async (event) => {
                  const response = await handleEvent(event.request);
                  event.respondWith(response);
                });
              `;
            }

            return stripIndent`
              import handleEvent from ${JSON.stringify(
                MAGIC_MODULE_HTTP_HANDLER,
              )};
              
              export default {
                async fetch(...args) {
                  const response = await handleEvent(...args);
                  return response;
                }
              }
            `;
          });
        },
      );
    },
  });
}

function ensureMjsExtension<T>(file?: T) {
  if (typeof file !== 'string') return file;
  const extension = extname(file);
  return `${file.slice(0, file.length - extension.length)}.mjs`;
}

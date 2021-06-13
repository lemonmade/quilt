import {extname} from 'path';
import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/craft';

export function cloudflareWorkers() {
  return createProjectPlugin<App>({
    name: 'Quilt.Cloudflare.Workers',
    build({configure}) {
      configure(
        (
          {
            rollupOutputs,
            rollupInputOptions,
            quiltAssetBaseUrl,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltAutoServer = false, quiltHttpHandler = false},
        ) => {
          if (!quiltHttpHandler) return;

          rollupInputOptions?.((options) => {
            // The default entry does not preserve exports, but cloudflare
            // uses the default export as the handler.
            options.preserveEntrySignatures = 'exports-only';
            return options;
          });

          rollupOutputs?.((outputs) => {
            for (const output of outputs) {
              // Cloudflare workers assume .js/.cjs are commonjs by default,
              // if we are using modules we default file names to .mjs so they
              // are automatically interpreted as modules.
              output.entryFileNames = ensureMjsExtension(output.entryFileNames);
              output.chunkFileNames = ensureMjsExtension(output.chunkFileNames);
              output.assetFileNames = ensureMjsExtension(output.assetFileNames);

              output.inlineDynamicImports = true;
            }

            return outputs;
          });

          if (quiltAutoServer) {
            quiltHttpHandlerRuntimeContent?.(
              async () => stripIndent`
                import HttpHandler from ${JSON.stringify(
                  MAGIC_MODULE_HTTP_HANDLER,
                )};
    
                import {createRequestHandler, respondWithAsset} from '@quilted/cloudflare/http-handlers';
    
                const handler = createRequestHandler(HttpHandler);

                const ASSETS_PATH = ${JSON.stringify(
                  await quiltAssetBaseUrl!.run(),
                )};

                export default {
                  async fetch(...args) {
                    const assetResponse = await respondWithAsset(...args, {
                      assetsPath: ASSETS_PATH,
                    });

                    if (assetResponse) {
                      return assetResponse;
                    }

                    const response = await handler(...args);
                    return response;
                  }
                }
              `,
            );
          } else {
            quiltHttpHandlerRuntimeContent?.(
              () => stripIndent`
                import HttpHandler from ${JSON.stringify(
                  MAGIC_MODULE_HTTP_HANDLER,
                )};
    
                import {createRequestHandler} from '@quilted/cloudflare/http-handlers';
    
                const handler = createRequestHandler(HttpHandler);
              `,
            );
          }
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

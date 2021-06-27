import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  App,
  Service,
  ResolvedOptions,
  BuildAppOptions,
  BuildServiceOptions,
} from '@quilted/sewing-kit';

import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/craft';

export function lambda({handlerName = 'handler'}: {handlerName?: string} = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.AWS.Lambda',
    build({configure}) {
      configure(
        (
          {
            rollupExternals,
            rollupInputOptions,
            rollupOutputs,
            quiltHttpHandlerRuntimeContent,
          },
          options,
        ) => {
          quiltHttpHandlerRuntimeContent?.(
            () => stripIndent`
              import HttpHandler from ${JSON.stringify(
                MAGIC_MODULE_HTTP_HANDLER,
              )};

              import {createLambdaApiGatewayProxy} from '@quilted/aws/http-handlers';

              export const ${handlerName} = createLambdaApiGatewayProxy(HttpHandler);
            `,
          );

          if (
            !(options as ResolvedOptions<BuildAppOptions>).quiltAutoServer &&
            !(options as ResolvedOptions<BuildServiceOptions>).quiltService
          ) {
            return;
          }

          rollupExternals?.((externals) => {
            externals.push('aws-sdk');
            return externals;
          });

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = 'exports-only';
            return options;
          });

          // AWS still only supports commonjs
          rollupOutputs?.((outputs) => {
            for (const output of outputs) {
              output.format = 'commonjs';
              output.exports = 'named';
              output.esModule = false;

              output.entryFileNames = ensureJsExtension(output.entryFileNames);
              output.chunkFileNames = ensureJsExtension(output.chunkFileNames);
              output.assetFileNames = ensureJsExtension(output.assetFileNames);
            }

            return outputs;
          });
        },
      );
    },
  });
}

function ensureJsExtension<T>(file?: T) {
  if (typeof file !== 'string') return file;
  return file.replace(/\.[mc]js$/, '.js');
}

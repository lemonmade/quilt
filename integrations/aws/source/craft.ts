import {stripIndent} from 'common-tags';

import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/craft';
import {createProjectPlugin} from '@quilted/craft/kit';

export function lambda({handlerName = 'handler'}: {handlerName?: string} = {}) {
  return createProjectPlugin({
    name: 'Quilt.AWS.Lambda',
    build({configure}) {
      configure(
        (
          {
            rollupExternals,
            rollupNodeBundle,
            rollupOutputs,
            quiltHttpHandlerRuntimeContent,
            quiltServiceOutputFormat,
            quiltAppServerOutputFormat,
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

          if (!options.quiltAppServer && !options.quiltService) {
            return;
          }

          quiltServiceOutputFormat?.(() => 'commonjs');

          quiltAppServerOutputFormat?.(() => 'commonjs');

          rollupExternals?.((externals) => [...externals, 'aws-sdk']);

          rollupNodeBundle?.((bundle) => {
            switch (bundle) {
              case true: {
                return {
                  builtins: false,
                  dependencies: true,
                  devDependencies: true,
                  peerDependencies: true,
                  exclude: ['aws-sdk'],
                };
              }
              case false: {
                return bundle;
              }
              default: {
                return {
                  builtins: false,
                  dependencies: true,
                  devDependencies: true,
                  peerDependencies: true,
                  ...bundle,
                  exclude: [...(bundle.exclude ?? []), 'aws-sdk'],
                };
              }
            }
          });

          // AWS still only supports commonjs
          rollupOutputs?.((outputs) => {
            for (const output of outputs) {
              output.format = 'commonjs';
              output.exports = 'named';
              output.esModule = false;
            }

            return outputs;
          });
        },
      );
    },
  });
}

import {stripIndent} from 'common-tags';

import {MAGIC_MODULE_REQUEST_ROUTER} from '@quilted/craft';
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
            quiltRequestRouterRuntimeContent,
            quiltServiceOutputFormat,
            quiltAppServerOutputFormat,
          },
          options,
        ) => {
          quiltRequestRouterRuntimeContent?.(
            () => stripIndent`
              import RequestRouter from ${JSON.stringify(
                MAGIC_MODULE_REQUEST_ROUTER,
              )};

              import {createLambdaApiGatewayProxy} from '@quilted/aws/request-router';

              export const ${handlerName} = createLambdaApiGatewayProxy(RequestRouter);
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

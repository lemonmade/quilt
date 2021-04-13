import {
  createProjectPlugin,
  Runtime,
  WebApp,
  Service,
} from '@sewing-kit/plugins';
import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/sewing-kit-plugins';
import type {} from '@sewing-kit/plugin-webpack';

export function lambda({handlerName = 'handler'}: {handlerName?: string} = {}) {
  return createProjectPlugin<WebApp | Service>(
    'Quilt.Aws.Lambda',
    ({tasks: {build}}) => {
      build.hook(({hooks}) => {
        hooks.target.hook(({target, hooks}) => {
          if (!target.runtime.includes(Runtime.Node)) return;

          hooks.configure.hook((configure) => {
            configure.webpackExternals?.hook((externals) => [
              ...externals,
              'aws-sdk',
            ]);

            configure.webpackOutputFilename?.hook(() => 'index.js');

            configure.webpackConfig?.hook((config) => ({
              ...config,
              output: {
                ...config.output,
                libraryTarget: 'commonjs2',
              },
            }));

            configure.quiltHttpHandlerContent?.hook(
              () => `
                import HttpHandler from ${JSON.stringify(
                  MAGIC_MODULE_HTTP_HANDLER,
                )};

                import {createLambdaApiGatewayProxy} from '@quilted/aws/http-handlers';

                export const ${handlerName} = createLambdaApiGatewayProxy(HttpHandler);
              `,
            );
          });
        });
      });
    },
  );
}

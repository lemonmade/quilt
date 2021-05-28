import {stripIndent} from 'common-tags';
import {
  createProjectPlugin,
  Runtime,
  WebApp,
  Service,
} from '@sewing-kit/plugins';
import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/sewing-kit';
import type {} from '@sewing-kit/plugin-rollup';

export function lambda({handlerName = 'handler'}: {handlerName?: string} = {}) {
  return createProjectPlugin<WebApp | Service>(
    'Quilt.Aws.Lambda',
    ({tasks: {build}}) => {
      build.hook(({hooks}) => {
        hooks.target.hook(({target, hooks}) => {
          if (!target.runtime.includes(Runtime.Node)) return;

          hooks.configure.hook((configure) => {
            configure.rollupExternal?.hook((externals) => [
              ...(Array.isArray(externals) ? externals : [externals as any]),
              'aws-sdk',
            ]);

            configure.quiltHttpHandlerRuntimeContent?.hook(
              () => stripIndent`
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

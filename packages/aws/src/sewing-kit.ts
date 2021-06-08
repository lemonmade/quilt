import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App, Service} from '@quilted/sewing-kit';

import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/craft';

export function lambda({handlerName = 'handler'}: {handlerName?: string} = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.AWS.Lambda',
    build({configure}) {
      configure(({quiltHttpHandlerRuntimeContent}) => {
        quiltHttpHandlerRuntimeContent?.(
          () => stripIndent`
            import HttpHandler from ${JSON.stringify(
              MAGIC_MODULE_HTTP_HANDLER,
            )};

            import {createLambdaApiGatewayProxy} from '@quilted/aws/http-handlers';

            export const ${handlerName} = createLambdaApiGatewayProxy(HttpHandler);
          `,
        );

        // TODO
        // configure.rollupExternal?.hook((externals) => [
        //   ...(Array.isArray(externals) ? externals : [externals as any]),
        //   'aws-sdk',
        // ]);
      });
    },
  });
}

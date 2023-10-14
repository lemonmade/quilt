import {MAGIC_MODULE_ENTRY, MAGIC_MODULE_REQUEST_ROUTER} from '../constants.ts';

import {createMagicModulePlugin} from '../shared/magic-module.ts';
import {multiline} from '../shared/strings.ts';

export function magicModuleRequestRouterEntry({
  host,
  port,
}: {
  host?: string;
  port?: number;
} = {}) {
  return createMagicModulePlugin({
    name: '@quilted/request-router',
    sideEffects: true,
    module: MAGIC_MODULE_ENTRY,
    async source() {
      const initialContent = multiline`
        import requestRouter from ${JSON.stringify(
          MAGIC_MODULE_REQUEST_ROUTER,
        )};

        import {createHttpServer} from '@quilted/quilt/request-router/node';

        const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
        const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};
      
        createHttpServer(requestRouter).listen(port, host);
      `;

      return initialContent;
    },
  });
}

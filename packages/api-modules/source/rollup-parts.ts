import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import {PREFIX} from './constants';

export function apiModulesPlugin({preserve = false} = {}): Plugin {
  return {
    name: '@quilted/api-modules',
    async resolveId(id, importer) {
      if (!id.startsWith(PREFIX)) return null;

      const resolvedId = await this.resolve(id.slice(PREFIX.length), importer, {
        skipSelf: true,
      });

      if (resolvedId == null) return null;

      return `${PREFIX}${resolvedId.id}`;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return;

      const path = '/start';
      const moduleId = id.slice(PREFIX.length);

      if (preserve) {
        return stripIndent`
          const load = () => import(${JSON.stringify(moduleId)});

          globalThis.Quilt?.Api.register(${JSON.stringify(path)}, load);

          export default load;
        `;
      }

      return stripIndent`
        const url = ${JSON.stringify(`/.api${path}`)};

        export default {
          url,
          async fetch({name, args, from, method}) {
            const fetchUrl = new URL(url, from);
            let body;

            if (method === 'GET') {
              if (name != null) fetchUrl.searchParams.set('name', name);
              if (args.length > 0) fetchUrl.searchParams.set('args', JSON.stringify(args));
            } else {
              body = {};
              if (name != null) body.name = name;
              if (args.length > 0) body.args = args;
              body = JSON.stringify(body);
            }

            const fetched = await fetch(fetchUrl, {method, body});
            const json = await fetched.json();
            return json;
          }
        };
      `;
    },
  };
}

import {URLSearchParams} from 'url';

import type {Plugin} from 'vite';
import {contentForWorker, PREFIX} from '@quilted/rollup/features/workers';

export function workers(): Plugin {
  return {
    name: '@quilted/workers',
    async resolveId(source, importer) {
      if (!source.startsWith(PREFIX)) return null;

      const [module, searchString] = source.slice(PREFIX.length).split('?');

      const resolvedModule = await this.resolve(module!, importer, {
        skipSelf: true,
      });

      if (resolvedModule == null) return null;

      return `${PREFIX}${resolvedModule.id}?${searchString}`;
    },
    async load(id, options) {
      const isEntry = id.startsWith(PREFIX);
      const normalizedId = isEntry ? id.slice(PREFIX.length) : id;

      const [module, searchString] = normalizedId.split('?') as [
        string,
        string?,
      ];
      const searchParams = searchString
        ? new URLSearchParams(searchString)
        : undefined;

      if (isEntry) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('worker_file', '');
        newSearchParams.set('type', 'module');
        const workerModule = `${module}?${newSearchParams.toString()}`;

        return `export default ${JSON.stringify({
          type: 'module',
          source: workerModule,
        })};`;
      }

      if (searchParams == null || !searchParams.has('worker_file')) return null;

      const wrapperModule = searchParams.get('module');
      const wrapperFunction = searchParams.get('function');

      if (wrapperModule == null || wrapperFunction == null) return null;

      if (options?.ssr) {
        return `export {};`;
      }

      const content = contentForWorker({
        module,
        wrapper: {module: wrapperModule, function: wrapperFunction},
      });

      return content;
    },
  };
}

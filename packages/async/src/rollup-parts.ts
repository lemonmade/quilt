import {URLSearchParams} from 'url';

import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import {PREFIX} from './constants';

const ENTRY_PREFIX = 'quilt-async-entry:';

export interface Options {}

export function asyncQuilt(): Plugin {
  return {
    name: '@quilted/async',
    async resolveDynamicImport(source, importer) {
      if (typeof source !== 'string') return null;

      const {asyncId, moduleId} = getAsyncRequest(source.replace(PREFIX, ''));
      const resolvedWorker = await this.resolve(moduleId, importer, {
        skipSelf: true,
      });

      if (resolvedWorker == null) return null;

      return `${ENTRY_PREFIX}${resolvedWorker.id}?id=${asyncId}`;
    },
    load(id: string) {
      if (!id.startsWith(ENTRY_PREFIX)) return;

      const {asyncId, moduleId} = getAsyncRequest(id.replace(ENTRY_PREFIX, ''));

      return {
        code: stripIndent`
          import * as AsyncModule from ${JSON.stringify(moduleId)};
          export {default} from ${JSON.stringify(moduleId)};
          export * from ${JSON.stringify(moduleId)};
          Quilt.AsyncAssets.set(${JSON.stringify(asyncId)}, AsyncModule);
        `,
        meta: {
          quilt: {asyncId},
        },
      };
    },
  };
}

function getAsyncRequest(id: string): {
  asyncId: string;
  moduleId: string;
} {
  const [moduleId, searchString] = id.split('?');
  const searchParams = new URLSearchParams(searchString);
  const asyncId = searchParams.get('id')!;

  return {
    asyncId,
    moduleId,
  };
}

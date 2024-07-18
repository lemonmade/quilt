import {createRequire} from 'module';

import type {Plugin} from 'vite';

const SOURCE_FILE_REGEX = /\.m?(js|ts)x?$/;
const IMPORTS_NEEDING_TRANSFORMATION_REGEX =
  /from\s+['"`]@quilted[/](quilt[/]async|quilt[/]threads|preact-workers|preact-async|async|workers)['"`]/;

const require = createRequire(import.meta.url);

export function babelPreprocess() {
  return {
    name: '@quilted/babel-preprocess',
    enforce: 'pre',
    async transform(code, id) {
      if (
        !SOURCE_FILE_REGEX.test(id) ||
        !IMPORTS_NEEDING_TRANSFORMATION_REGEX.test(code)
      ) {
        return null;
      }

      const {transformAsync} = await import('@babel/core');

      const {code: transformedCode, map} =
        (await transformAsync(code, {
          filename: id,
          sourceMaps: true,
          sourceType: 'module',
          plugins: [
            require.resolve('@quilted/babel/async'),
            require.resolve('@quilted/babel/workers'),
          ],
          parserOpts: {
            plugins: [
              'jsx',
              'typescript',
              'classProperties',
              'classPrivateProperties',
              'decorators',
              'decoratorAutoAccessors',
              'dynamicImport',
              'exportDefaultFrom',
              'exportNamespaceFrom',
              'topLevelAwait',
              'explicitResourceManagement',
              'importMeta',
              'importAttributes',
            ],
          },
        })) ?? {};

      return {code: transformedCode ?? undefined, map};
    },
  } satisfies Plugin;
}

import * as fs from 'fs/promises';
import {glob} from 'glob';

import type {Plugin, InputOptions} from 'rollup';
import replace, {type RollupReplaceOptions} from '@rollup/plugin-replace';

export function smartReplace(
  values: NonNullable<RollupReplaceOptions['values']>,
  options?: Omit<RollupReplaceOptions, 'values'>,
) {
  return replace({
    // @see https://github.com/vitejs/vite/blob/2b1ffe86328f9d06ef9528ee117b61889893ddcc/packages/vite/src/node/plugins/define.ts#L108-L119
    delimiters: [
      '(?<![\\p{L}\\p{N}_$]|(?<!\\.\\.)\\.)(',
      ')(?:(?<=\\.)|(?![\\p{L}\\p{N}_$]|\\s*?=[^=]))',
    ],
    preventAssignment: true,
    ...options,
    values,
  });
}

export function removeBuildFiles(
  patterns: string | string[],
  {root = process.cwd()}: {root?: string} = {},
) {
  return {
    name: '@quilt/remove-build-files',
    async buildStart() {
      const matches = await glob(patterns, {
        cwd: root,
        absolute: true,
      });

      await Promise.all(
        matches.map((file) => fs.rm(file, {recursive: true, force: true})),
      );
    },
  } satisfies Plugin;
}

export async function getNodePlugins() {
  const [
    {default: commonjs},
    {default: json},
    {default: nodeResolve},
    {default: nodeExternals},
  ] = await Promise.all([
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-node-resolve'),
    import('rollup-plugin-node-externals'),
  ]);

  return [
    nodeExternals({}),
    nodeResolve({
      preferBuiltins: true,
      dedupe: [],
      // extensions,
      // exportConditions,
    }),
    commonjs(),
    json(),
  ];
}

export function rollupPluginsToArray(plugins?: InputOptions['plugins']) {
  return Array.isArray(plugins) ? [...plugins] : plugins ? [plugins] : [];
}

export function addRollupOnWarn(
  options: InputOptions,
  warn: NonNullable<InputOptions['onwarn']>,
): InputOptions {
  const {onwarn: originalOnWarn} = options;

  return {
    ...options,
    onwarn(warning, defaultWarn) {
      warn(warning, (warning) => {
        if (originalOnWarn && typeof warning === 'object') {
          originalOnWarn(warning, defaultWarn);
        } else {
          defaultWarn(warning);
        }
      });
    },
  };
}

import {createRequire} from 'module';

import babel, {type RollupBabelInputPluginOptions} from '@rollup/plugin-babel';
import esbuild from 'rollup-plugin-esbuild';
import type {Options as PresetEnvOptions} from '@babel/preset-env';

const require = createRequire(import.meta.url);

export function sourceCode({
  mode,
  targets,
  react = true,
  babel: useBabel = true,
}: {
  mode?: 'development' | 'production';
  react?: boolean | 'react' | 'preact';
  targets?: readonly string[];
  babel?:
    | boolean
    | {
        useBuiltIns?: PresetEnvOptions['useBuiltIns'];
        options?(
          options: RollupBabelInputPluginOptions,
        ): RollupBabelInputPluginOptions | void;
      };
}) {
  if (!useBabel) {
    return esbuild({
      // Support very modern features
      target: 'es2022',
      jsx: 'automatic',
      jsxImportSource: typeof react === 'string' ? react : 'preact',
      exclude: 'node_modules/**',
    });
  }

  const babelOverride = typeof useBabel === 'boolean' ? {} : useBabel;
  const useBuiltIns = babelOverride.useBuiltIns;

  let babelOptions: RollupBabelInputPluginOptions = {
    envName: mode,
    configFile: false,
    babelrc: false,
    presets: [
      require.resolve('@babel/preset-typescript'),
      [
        require.resolve('@babel/preset-react'),
        {
          runtime: 'automatic',
          importSource: typeof react === 'string' ? react : 'react',
          development: mode === 'development',
        },
      ],
      [
        require.resolve('@babel/preset-env'),
        {
          bugfixes: true,
          shippedProposals: true,
          useBuiltIns,
          corejs: useBuiltIns ? 3 : undefined,
          // I thought I wanted this, but it seems to break the `targets` option
          // passed as a root argument.
          // ignoreBrowserslistConfig: targets != null,
        } satisfies import('@babel/preset-env').Options,
      ],
    ],
    plugins: [
      [
        require.resolve('@babel/plugin-proposal-decorators'),
        {version: '2023-01'},
      ],
    ],
    extensions: [
      '.ts',
      '.tsx',
      '.mts',
      '.mtsx',
      '.js',
      '.jsx',
      '.es6',
      '.es',
      '.mjs',
    ],
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
    skipPreflightCheck: true,
    // Babel doesn’t like this option being set to `undefined`.
    ...(targets ? {targets: targets as string[]} : {}),
  };

  babelOptions = babelOverride.options?.(babelOptions) ?? babelOptions;

  return babel(babelOptions);
}

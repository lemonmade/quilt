import {createRequire} from 'module';

import babel, {type RollupBabelInputPluginOptions} from '@rollup/plugin-babel';
import esbuild from 'rollup-plugin-esbuild';

const require = createRequire(import.meta.url);

export function sourceCode({
  mode,
  targets,
  babel: useBabel = true,
}: {
  mode?: 'development' | 'production';
  targets?: string[];
  babel?:
    | boolean
    | {
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
      jsxImportSource: 'react',
      exclude: 'node_modules/**',
    });
  }

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
          importSource: 'react',
          development: mode === 'development',
        },
      ],
      [
        require.resolve('@babel/preset-env'),
        {
          useBuiltIns: false,
          bugfixes: true,
          shippedProposals: true,
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
    ...(targets ? {targets} : {}),
  };

  if (typeof useBabel === 'object') {
    babelOptions = useBabel.options?.(babelOptions) ?? babelOptions;
  }

  return babel(babelOptions);
}

import {createRequire} from 'module';

import babel, {type RollupBabelInputPluginOptions} from '@rollup/plugin-babel';
import esbuild from 'rollup-plugin-esbuild';

const require = createRequire(import.meta.url);

export function esnext({
  mode,
  targets,
  babel: useBabel = true,
}: {
  mode?: 'development' | 'production';
  targets?: readonly string[];
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
      include: /\.esnext$/,
      target: 'es2022',
      loaders: {
        '.esnext': 'js',
      },
    });
  }

  let babelOptions: RollupBabelInputPluginOptions = {
    envName: mode,
    configFile: false,
    babelrc: false,
    presets: [
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
    include: /\.esnext$/,
    extensions: ['.esnext'],
    babelHelpers: 'bundled',
    skipPreflightCheck: true,
    // Babel doesn’t like this option being set to `undefined`.
    ...(targets ? {targets: targets as string[]} : {}),
  };

  if (typeof useBabel === 'object') {
    babelOptions = useBabel.options?.(babelOptions) ?? babelOptions;
  }

  return babel(babelOptions);
}

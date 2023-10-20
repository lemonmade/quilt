import {createRequire} from 'module';

import babel from '@rollup/plugin-babel';

const require = createRequire(import.meta.url);

export function sourceCode({
  mode,
  targets,
}: {
  mode?: 'development' | 'production';
  targets?: string[];
}) {
  return babel({
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
          // @ts-expect-error This is a valid option
          corejs: '3.15',
          useBuiltIns: false,
          bugfixes: true,
          shippedProposals: true,
          ignoreBrowserslistConfig: targets != null,
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
  });
}

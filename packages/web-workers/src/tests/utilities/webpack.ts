import * as path from 'path';
import webpack from 'webpack';

// eslint-disable-next-line import/no-extraneous-dependencies
import {Target, Module} from '@sewing-kit/babel-preset';

import {Context} from './context';

export function runWebpack(
  {workspace, server}: Context,
  extraConfig: import('webpack').Configuration,
) {
  return new Promise((resolve, reject) => {
    const srcRoot = path.resolve(__dirname, '../../');

    webpack(
      {
        ...extraConfig,
        output: {
          path: workspace.buildPath(),
          publicPath: server.assetUrl().href,
          globalObject: 'self',
          ...extraConfig.output,
        },
        resolve: {
          // Need to include .esnext to get the non-polyfill-assuming version of
          // remote-call.
          extensions: ['.esnext', '.js', '.ts', '.json'],
          alias: {
            '@quilted/web-workers': srcRoot,
            '@quilted/web-workers/worker': path.join(srcRoot, 'worker'),
          },
        },
        resolveLoader: {
          extensions: ['.js', '.ts', '.json'],
        },
        module: {
          rules: [
            {
              include: srcRoot,
              exclude: /fixtures/,
              use: [
                {
                  loader: 'babel-loader',
                  options: {
                    babelrc: false,
                    presets: [
                      [
                        '@sewing-kit/babel-preset',
                        {target: Target.Node, modules: Module.Preserve},
                      ],
                      '@babel/preset-typescript',
                    ],
                  },
                },
              ],
            },
            ...(extraConfig.module?.rules ?? []),
          ],
        },
      },
      (error, stats) => {
        if (error) {
          reject(error);
        } else if (stats.hasErrors()) {
          reject(stats.compilation.errors[0]);
        } else {
          resolve(stats);
        }
      },
    );
  });
}

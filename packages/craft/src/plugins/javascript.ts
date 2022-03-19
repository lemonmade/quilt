import {createRequire} from 'module';

import {createProjectPlugin, createWorkspacePlugin} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-jest';

const require = createRequire(import.meta.url);

export function javascriptProject() {
  return createProjectPlugin({
    name: 'SewingKit.JavaScript',
    test({configure}) {
      configure(
        ({
          jestExtensions,
          jestTransforms,
          babelPresets,
          babelPlugins,
          babelTargets,
        }) => {
          // Add TypeScript extensions for workspace-level tests
          jestExtensions?.((extensions) =>
            Array.from(new Set(['.js', '.jsx', '.mjs', ...extensions])),
          );

          jestTransforms?.(async (transforms) => {
            if (
              babelPresets == null ||
              babelPlugins == null ||
              babelTargets == null
            ) {
              return transforms;
            }

            const [presets, plugins, targets] = await Promise.all([
              babelPresets.run([]),
              babelPlugins.run([]),
              babelTargets.run(['current node']),
            ]);

            transforms['\\.jsx?$'] = [
              require.resolve('babel-jest'),
              {
                presets,
                plugins,
                configFile: false,
                babelrc: false,
                targets,
              },
            ];
            transforms['\\.mjs$'] = transforms['\\.jsx?$'];
            return transforms;
          });
        },
      );
    },
  });
}

export function javascriptWorkspace() {
  return createWorkspacePlugin({
    name: 'SewingKit.JavaScript',
    test({configure}) {
      configure(
        ({
          jestExtensions,
          jestTransforms,
          babelPresets,
          babelPlugins,
          babelTargets,
        }) => {
          // Add TypeScript extensions for workspace-level tests
          jestExtensions?.((extensions) =>
            Array.from(new Set(['.js', '.jsx', '.mjs', ...extensions])),
          );

          jestTransforms?.(async (transforms) => {
            if (
              babelPresets == null ||
              babelPlugins == null ||
              babelTargets == null
            ) {
              return transforms;
            }

            const [presets, plugins, targets] = await Promise.all([
              babelPresets.run([]),
              babelPlugins.run([]),
              babelTargets.run(['current node']),
            ]);

            transforms['\\.jsx?$'] = [
              require.resolve('babel-jest'),
              {
                presets,
                plugins,
                configFile: false,
                babelrc: false,
                targets,
              },
            ];
            transforms['\\.mjs$'] = transforms['\\.jsx?$'];
            return transforms;
          });
        },
      );
    },
  });
}

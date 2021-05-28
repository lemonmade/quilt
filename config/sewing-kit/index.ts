import {
  Package,
  createComposedProjectPlugin,
  createProjectTestPlugin,
  createProjectBuildPlugin,
  createProjectPlugin,
} from '@sewing-kit/plugins';

import {react} from '@sewing-kit/plugin-react';
import {javascript, updateBabelPreset} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {packageBuild} from '@sewing-kit/plugin-package-build';
import type {} from '@sewing-kit/plugin-rollup';
import type {} from '@sewing-kit/plugin-jest';

import type {MangleOptions} from 'terser';

interface Options {
  /**
   * Whether to build versions of the output that support native ES modules.
   */
  esmodules?: boolean;
  /**
   * Whether the CommonJS version of the output should use named properties on
   * `module.exports` for all exported values, including `default` (`'named'`, the
   * default value), or to treat the default export as `module.exports`
   * (`'default'`).
   *
   * @see https://rollupjs.org/guide/en/#outputexports
   */
  exports?: 'default' | 'named';
}

export function quiltPackage({
  esmodules = true,
  exports = 'named',
}: Options = {}) {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    javascript(),
    typescript(),
    react(),
    reactJsxRuntime(),
    packageBuild({
      browserTargets: 'last 2 versions',
      nodeTargets: 'node 12',
      esmodules,
      esnext: esmodules,
    }),
    createProjectBuildPlugin('Quilt.RollupFixes', ({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(
          ({rollupExternal, rollupPlugins, rollupOutputs}) => {
            const EXTERNAL_REGEX = /(node_modules|^@quilted|^react$|^preact$|^core-js|^regenerator-runtime)/;

            rollupExternal?.hook((external) =>
              Array.isArray(external)
                ? [...external, EXTERNAL_REGEX]
                : [external as any, EXTERNAL_REGEX],
            );

            rollupPlugins?.hook(async (plugins) => {
              const {default: json} = await import('@rollup/plugin-json');
              return [...plugins, json()];
            });

            rollupOutputs?.hook((outputs) =>
              outputs.map((output) => ({...output, exports})),
            );
          },
        );
      });
    }),
    createProjectTestPlugin('Quilt.IgnoreDTSFiles', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestWatchIgnore?.hook((ignore) => [
          ...ignore,
          '.*\\.d\\.ts$',
        ]);
      });
    }),
  ]);
}

export function terser({
  mangle = true,
  nameCache: nameCacheFile,
}: {nameCache?: string; mangle?: MangleOptions | boolean} = {}) {
  return createProjectBuildPlugin<Package>(
    'Quilt.Mangle',
    ({hooks, api, project}) => {
      hooks.target.hook(({hooks, target}) => {
        hooks.steps.hook((steps) => [
          ...steps,
          api.createStep({id: 'Quilt.Mangle', label: 'Mangle'}, async () => {
            const {options} = target;
            let outputDir: string | undefined;
            let modules = false;

            const [{minify}, {default: limit}] = await Promise.all([
              import('terser'),
              import('p-limit'),
            ]);

            if (options.commonjs) {
              outputDir = project.fs.buildPath('cjs');
            } else if (options.esmodules) {
              outputDir = project.fs.buildPath('esm');
              modules = true;
            } else if (options.esnext) {
              outputDir = project.fs.buildPath('esnext');
              modules = true;
            } else if (options.node) {
              outputDir = project.fs.buildPath('node');
            }

            if (!outputDir) return;

            const files = await project.fs.glob(
              project.fs.resolvePath(outputDir, '**/*'),
            );
            const run = limit(10);

            await Promise.all(
              files.map((file) =>
                run(async () => {
                  const [content, nameCache] = await Promise.all([
                    project.fs.read(file),
                    (async () => {
                      if (!nameCacheFile) return {};

                      try {
                        const nameCache = await project.fs.read(
                          project.fs.resolvePath(nameCacheFile),
                        );

                        return JSON.parse(nameCache);
                      } catch {
                        return {};
                      }
                    })(),
                  ]);

                  const result = await minify(content, {
                    mangle,
                    compress: false,
                    ecma: 2017,
                    toplevel: true,
                    module: modules,
                    nameCache,
                  });

                  await project.fs.write(file, result.code!);
                }),
              ),
            );
          }),
        ]);
      });
    },
  );
}

// eslint-disable-next-line no-warning-comments
// TODO: should be in the React plugin
function reactJsxRuntime() {
  return createProjectPlugin('Quilt.ReactJsxRuntime', ({tasks}) => {
    const updateReactBabelPreset = updateBabelPreset(['@babel/preset-react'], {
      runtime: 'automatic',
      importSource: 'react',
    });

    tasks.build.hook(({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(({babelConfig}) => {
          babelConfig?.hook(updateReactBabelPreset);
        });
      });
    });

    tasks.dev.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig?.hook(updateReactBabelPreset);
      });
    });

    tasks.test.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig?.hook(updateReactBabelPreset);
      });
    });
  });
}

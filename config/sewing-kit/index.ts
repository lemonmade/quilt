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
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import type {} from '@sewing-kit/plugin-jest';
import type {} from '@sewing-kit/plugin-package-node';
import type {} from '@sewing-kit/plugin-package-esnext';
import type {} from '@sewing-kit/plugin-package-esmodules';
import type {} from '@sewing-kit/plugin-package-commonjs';

import type {MangleOptions} from 'terser';

export function quiltPackage({binaryOnly = false} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    javascript(),
    typescript(),
    react(),
    reactJsxRuntime(),
    buildFlexibleOutputs({
      esnext: !binaryOnly,
      esmodules: !binaryOnly,
    }),
    createProjectTestPlugin('Quilt.IgnoreDTSFiles', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestWatchIgnore.hook((ignore) => [
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

                  await project.fs.write(file, result.code);
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
          babelConfig.hook(updateReactBabelPreset);
        });
      });
    });

    tasks.dev.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig.hook(updateReactBabelPreset);
      });
    });

    tasks.test.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig.hook(updateReactBabelPreset);
      });
    });
  });
}

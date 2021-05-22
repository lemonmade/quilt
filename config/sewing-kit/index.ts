import {relative, dirname} from 'path';
import {
  Package,
  createComposedProjectPlugin,
  createProjectTestPlugin,
  createProjectBuildPlugin,
  createProjectPlugin,
} from '@sewing-kit/plugins';
import type {ProjectPluginContext} from '@sewing-kit/plugins';

import {react} from '@sewing-kit/plugin-react';
import {javascript, updateBabelPreset} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {packageBuild} from '@sewing-kit/plugin-package-build';
import type {} from '@sewing-kit/plugin-rollup';
import type {} from '@sewing-kit/plugin-jest';

import type {MangleOptions} from 'terser';

export function quiltPackage() {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    javascript(),
    typescript(),
    react(),
    reactJsxRuntime(),
    packageBuild({
      browserTargets: 'last 2 versions',
      nodeTargets: 'node 12',
      binaries: false,
    }),
    buildFixedBinaries(),
    createProjectBuildPlugin('Quilt.ExternalSelf', ({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(({rollupExternal, rollupPlugins}) => {
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
        });
      });
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

// Fixes an issue in the skn version that points at ../build/node
function buildFixedBinaries() {
  return createProjectBuildPlugin<Package>(
    'Quilt.BuildBinaries',
    ({hooks, project, api}) => {
      hooks.steps.hook((steps) =>
        project.binaries.length > 0
          ? [...steps, createWriteBinariesStep({project, api})]
          : steps,
      );
    },
  );
}

function createWriteBinariesStep({
  project,
  api,
}: Pick<ProjectPluginContext<Package>, 'project' | 'api'>) {
  const binaryCount = project.binaries.length;
  const sourceRoot = project.fs.resolvePath('src');

  return api.createStep(
    {
      id: 'PackageBinaries.WriteBinaries',
      label:
        binaryCount === 1 ? 'write binary' : `write ${binaryCount} binaries`,
    },
    async (step) => {
      await Promise.all(
        project.binaries.map(async ({name, root, aliases = []}) => {
          const relativeFromSourceRoot = relative(
            sourceRoot,
            project.fs.resolvePath(root),
          );

          const destinationInOutput = project.fs.buildPath(
            'cjs',
            relativeFromSourceRoot,
          );

          for (const binaryName of [name, ...aliases]) {
            const binaryFile = project.fs.resolvePath('bin', binaryName);
            const relativeFromBinary = normalizedRelative(
              dirname(binaryFile),
              destinationInOutput,
            );

            await project.fs.write(
              binaryFile,
              `#!/usr/bin/env node\nrequire(${JSON.stringify(
                relativeFromBinary,
              )})`,
            );

            await step.exec('chmod', ['+x', binaryFile]);
          }
        }),
      );
    },
  );
}

function normalizedRelative(from: string, to: string) {
  const rel = relative(from, to);
  return rel.startsWith('.') ? rel : `./${rel}`;
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

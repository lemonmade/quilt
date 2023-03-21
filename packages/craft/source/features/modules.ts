import {rm} from 'fs/promises';
import {join} from 'path';

import {createProjectPlugin} from '../kit';
import type {Project, WaterfallHookWithDefault} from '../kit';

import type {} from '../tools/rollup';

import {targetsSupportModules} from './targets';

export interface ModuleHooks {
  moduleEntry: WaterfallHookWithDefault<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Indicates that a `module` build is being performed.
     */
    quiltModuleBuild: {
      name: string;
      only: boolean;
      targets: string[];
    };
  }

  interface BuildProjectConfigurationHooks extends ModuleHooks {}
  interface DevelopProjectConfigurationHooks extends ModuleHooks {}
}

export interface Options {
  /**
   * The entry point for your module. When you do not explicitly provide
   * this option, Quilt will provide a default that is based on the following
   * lookups:
   *
   * - the file referenced in the `main` field of `package.json`
   * - the source file for the root entry (`'.'`) of your package, as defined
   *   by the `exports` property of your `package.json`
   * - The first file matching the glob `index.m?{js,ts}x?` in your project.
   */
  entry?: string;
}

export function moduleBase({entry}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Package',
    build({project, configure, hooks}) {
      const getEntry = createCachedSourceEntryGetter(project, entry);

      hooks<ModuleHooks>(({waterfall}) => ({
        moduleEntry: waterfall({
          default: getEntry,
        }),
      }));

      configure(({babelRuntimeHelpers}) => {
        babelRuntimeHelpers?.(() => 'bundled');
      });
    },
    develop({project, configure, hooks}) {
      const getEntry = createCachedSourceEntryGetter(project, entry);

      hooks<ModuleHooks>(({waterfall}) => ({
        moduleEntry: waterfall({
          default: getEntry,
        }),
      }));

      configure(({babelRuntimeHelpers}) => {
        babelRuntimeHelpers?.(() => 'bundled');
      });
    },
  });
}

function createCachedSourceEntryGetter(
  project: Project,
  defaultEntry?: string,
): () => Promise<string> {
  if (defaultEntry != null) return () => Promise.resolve(defaultEntry);

  let cached: Promise<string> | undefined;

  return () => {
    cached ??= sourceEntryForProject(project);
    return cached;
  };
}

export async function sourceEntryForProject(project: Project) {
  const main = project.packageJson?.raw.main;

  if (typeof main === 'string') {
    return await resolveTargetFileAsSource(main, project);
  }

  const exports = project.packageJson?.raw.exports;

  if (typeof exports === 'string') {
    return await resolveTargetFileAsSource(exports, project);
  }

  if (exports != null && typeof exports === 'object') {
    const exportCondition = (exports as any)['.'];
    let targetFile: string | null | undefined = null;

    if (typeof exportCondition === 'string') {
      targetFile = exportCondition;
    } else {
      targetFile ??=
        exportCondition['source'] ??
        exportCondition['quilt:source'] ??
        exportCondition['quilt:esnext'] ??
        Object.values(exportCondition).find(
          (condition) =>
            typeof condition === 'string' && condition.startsWith('./build/'),
        );
    }

    if (targetFile != null) {
      const sourceFile = await resolveTargetFileAsSource(targetFile, project);
      if (sourceFile) return sourceFile;
    }
  }

  const indexFile = (
    await project.fs.glob(`index.{js,jsx,mjs,ts,tsx,mts,mtsx}`)
  )[0];

  if (indexFile == null) {
    throw new Error(`Could not determine entry file for ${project.name}`);
  }

  return indexFile;
}

async function resolveTargetFileAsSource(file: string, project: Project) {
  const sourceFile = file.includes('/build/')
    ? (
        await project.fs.glob(
          file
            .replace(/[/]build[/][^/]+[/]/, '/*/')
            .replace(/(\.d\.ts|\.[\w]+)$/, '.*'),
          {ignore: [project.fs.resolvePath(file)]},
        )
      )[0]!
    : project.fs.resolvePath(file);

  return sourceFile;
}

export interface BuildOptions {
  minify?: boolean;
  hash?: boolean;
  targets?: string | string[];
}

export const STEP_NAME = 'Quilt.Module.Build';

export function moduleBuild({
  minify: shouldMinify = false,
  hash = false,
  targets,
}: BuildOptions = {}) {
  return createProjectPlugin({
    name: 'Quilt.ModuleBuild',
    build({project, configure, run}) {
      configure(
        (
          {
            runtimes,
            outputDirectory,
            moduleEntry,
            rollupPlugins,
            rollupInput,
            rollupOutputs,
            rollupNodeBundle,
            babelPresetEnvOptions,
            browserslistTargets,
            quiltAssetManifestPath,
          },
          {quiltModuleBuild},
        ) => {
          if (!quiltModuleBuild) return;

          babelPresetEnvOptions?.(() => {
            return {
              useBuiltIns: false,
              bugfixes: true,
              shippedProposals: true,
              // I thought I wanted this on, but if you do this, Babel
              // stops respecting the top-level `targets` option and tries
              // to use the targets passed to the preset directly instead.
              // ignoreBrowserslistConfig: true,
            };
          });

          runtimes(() => [{target: 'browser'}]);

          outputDirectory?.((directory) => join(directory, 'assets'));

          const targetFilenamePart = quiltModuleBuild.only
            ? ''
            : `.${quiltModuleBuild.name}`;

          browserslistTargets?.(() => quiltModuleBuild.targets);

          quiltAssetManifestPath?.(() =>
            project.fs.buildPath(
              `manifests/manifest${targetFilenamePart}.json`,
            ),
          );

          rollupPlugins?.(async (plugins) => {
            const [{visualizer}, {minify}] = await Promise.all([
              import('rollup-plugin-visualizer'),
              shouldMinify
                ? import('rollup-plugin-esbuild')
                : Promise.resolve({minify: undefined}),
            ]);

            const newPlugins = [...plugins];

            if (minify) {
              newPlugins.push(minify());
            }

            newPlugins.push(
              visualizer({
                template: 'treemap',
                open: false,
                brotliSize: true,
                filename: project.fs.buildPath(
                  'reports',
                  `bundle-visualizer${targetFilenamePart}.html`,
                ),
              }),
            );

            return newPlugins;
          });

          rollupNodeBundle?.((currentBundle) => {
            return {
              ...(typeof currentBundle === 'boolean' ? {} : currentBundle),
              builtins: false,
              dependencies: false,
              devDependencies: true,
              peerDependencies: false,
            };
          });

          rollupInput?.(async () => {
            return [project.fs.resolvePath(await moduleEntry!.run())];
          });

          rollupOutputs?.(async (outputs) => {
            const [dir, isESM] = await Promise.all([
              outputDirectory.run(project.fs.buildPath()),
              targetsSupportModules(quiltModuleBuild.targets),
            ]);

            const hashPart = hash ? '.[hash]' : '';

            return [
              ...outputs,
              {
                format: isESM ? 'esm' : 'iife',
                dir,
                entryFileNames: `[name]${targetFilenamePart}${hashPart}.js`,
                assetFileNames: `[name]${targetFilenamePart}${hashPart}.[ext]`,
              },
            ];
          });
        },
      );

      run(async (step, {configuration}) => {
        const steps = [
          step({
            stage: 'pre',
            name: `${STEP_NAME}.Clean`,
            label: `Cleaning build directory for ${project.name}`,
            async run() {
              await Promise.all([
                rm(project.fs.buildPath('assets'), {
                  recursive: true,
                  force: true,
                }),
                rm(project.fs.buildPath('manifests'), {
                  recursive: true,
                  force: true,
                }),
                rm(project.fs.buildPath('reports'), {
                  recursive: true,
                  force: true,
                }),
              ]);
            },
          }),
        ];

        const browserslistConfig: Record<string, string[]> = {};

        const {default: browserslist} = await import('browserslist');

        const foundConfig = targets
          ? {
              defaults: Array.isArray(targets) ? targets : [targets],
            }
          : browserslist.findConfig(project.root) ?? {
              defaults: ['extends @quilted/browserslist-config/modules'],
            };

        for (const [name, query] of Object.entries(foundConfig)) {
          browserslistConfig[name] = browserslist(query);
        }

        const browserslistEntries = Object.entries(browserslistConfig);

        for (const [name, targets] of browserslistEntries) {
          steps.push(
            step({
              name: STEP_NAME,
              label: `Build output for ${project.name}`,
              async run() {
                const [configure, {buildWithRollup}] = await Promise.all([
                  configuration({
                    quiltModuleBuild: {
                      only: browserslistEntries.length === 1,
                      name: name === 'defaults' ? 'default' : name,
                      targets,
                    },
                  }),
                  import('../tools/rollup'),
                ]);

                await buildWithRollup(project, configure);
              },
            }),
          );
        }

        return steps;
      });
    },
  });
}

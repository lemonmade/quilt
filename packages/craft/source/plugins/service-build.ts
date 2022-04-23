import * as path from 'path';
import {rm} from 'fs/promises';

import type {ModuleFormat} from 'rollup';

import {createProjectPlugin} from '../kit';
import type {Service, WaterfallHook} from '../kit';

import {addRollupNodeBundleInclusion, RollupNodeBundle} from '../tools/rollup';

import type {EnvironmentOptions} from './magic-module-env';

export interface ServiceBuildHooks {
  /**
   * The module format that will be used for the application server. By
   * default, this is set to `module`, which generates native ES module
   * outputs.
   */
  quiltServiceOutputFormat: WaterfallHook<ModuleFormat>;
}

declare module '@quilted/sewing-kit' {
  interface BuildServiceOptions {
    /**
     * Indicates that the base build is being generated by `quilt`.
     */
    quiltService: boolean;
  }

  interface BuildServiceConfigurationHooks extends ServiceBuildHooks {}
}

export interface Options {
  env?: EnvironmentOptions;
  minify: boolean;

  /**
   * Determines how dependencies will be bundled into your application.
   * By default, Quilt will bundle all dependencies (other than node
   * built-in modules) into the build outputs, which optimizes for
   * performance. You can change this behavior by passing `false`,
   * which will force all dependencies to be resolved at runtime, or
   * by passing an object with granular controls on what dependencies
   * are bundled.
   */
  bundle?: boolean | RollupNodeBundle;
  httpHandler: boolean;
}

const MAGIC_ENTRY_MODULE = '__quilt__/MagicEntryService';

export function serviceBuild({
  minify,
  bundle = true,
  httpHandler,
  env,
}: Options) {
  return createProjectPlugin<Service>({
    name: 'Quilt.Service.Build',
    build({project, hooks, configure, run}) {
      hooks<ServiceBuildHooks>(({waterfall}) => ({
        quiltServiceOutputFormat: waterfall(),
      }));

      configure(
        (
          {
            outputDirectory,
            rollupInput,
            rollupPlugins,
            rollupOutputs,
            rollupNodeBundle,
            quiltServiceOutputFormat,
            quiltInlineEnvironmentVariables,
            quiltRuntimeEnvironmentVariables,
          },
          {quiltService = false},
        ) => {
          if (!quiltService) return;

          const inlineEnv = env?.inline;

          if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          quiltRuntimeEnvironmentVariables?.(
            (runtime) => runtime ?? 'process.env',
          );

          rollupNodeBundle?.(() => {
            return addRollupNodeBundleInclusion(
              /@quilted[/]quilt[/](magic|env|polyfills)/,
              bundle,
            );
          });

          rollupInput?.(async () => {
            return [MAGIC_ENTRY_MODULE];
          });

          rollupPlugins?.(async (plugins) => {
            plugins.unshift({
              name: '@quilted/magic-module-service',
              resolveId(id, importer) {
                if (id !== MAGIC_ENTRY_MODULE) return null;

                return this.resolve(
                  project.fs.resolvePath(project.entry ?? ''),
                  importer,
                  {skipSelf: true},
                );
              },
            });

            if (minify) {
              const {minify} = await import('rollup-plugin-esbuild');
              plugins.push(minify());
            }

            return plugins;
          });

          rollupOutputs?.(async (outputs) => {
            const [format, outputRoot] = await Promise.all([
              quiltServiceOutputFormat!.run('module'),
              outputDirectory.run(project.fs.buildPath()),
            ]);

            outputs.push({
              format,
              entryFileNames: 'index.js',
              dir: path.join(outputRoot, 'runtime'),
            });

            return outputs;
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.Service.Build',
          label: `Build service ${project.name}`,
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({
                quiltService: true,
                quiltHttpHandler: httpHandler,
              }),
              import('../tools/rollup'),
            ]);

            await rm(project.fs.buildPath('runtime'), {
              recursive: true,
              force: true,
            });

            await buildWithRollup(project, configure);
          },
        }),
      );
    },
  });
}
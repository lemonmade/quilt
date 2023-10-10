import * as path from 'path';
import {rm} from 'fs/promises';

import type {GetManualChunk} from 'rollup';

import type {} from '../tools/postcss.ts';
import type {} from '../features/async.ts';
import type {} from '../features/graphql.ts';

import {createProjectPlugin, Project, Workspace} from '../kit.ts';

import {BROWSERSLIST_MODULES_QUERY} from './app-base.ts';
import type {EnvironmentOptions} from './magic-module-env.ts';
import type {Options as MagicBrowserEntryOptions} from './rollup/magic-browser-entry.ts';

export interface AssetOptions {
  /**
   * Whether to minify assets created by Quilt. Defaults to `true`.
   */
  minify: boolean;
}

export type AppBrowserOptions = Pick<MagicBrowserEntryOptions, 'entry'>;

export interface Options {
  server: boolean;
  static: boolean;
  assets: AssetOptions;
  browser: AppBrowserOptions;
  env?: EnvironmentOptions;
}

export interface BrowserTarget {
  name: string;
  priority: number;
  targets: string[];
}

export interface QuiltMetadata {
  /**
   * The source for a regular expression that matches the useragent
   * string of the target browsers for this build.
   */
  browsers: string;

  /**
   * The priority to use for this manifest. The priority is used at
   * runtime by quilt to determine the order in which to test manifests
   * against the browser targets for the bundle, which allows quilt to
   * select the "best" (typically, that means smallest) bundle.
   */
  priority: number;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Details about the browser build being created by Quilt.
     */
    quiltAppBrowser: BrowserTarget;
  }
}

const MAGIC_ENTRY_MODULE = '__quilt__/AppEntry.tsx';
export const STEP_NAME = 'Quilt.App.Build';

export function appBuild({assets, browser, env}: Options) {
  return createProjectPlugin({
    name: STEP_NAME,
    build({project, workspace, configure, run}) {
      configure(
        (
          {
            runtimes,
            browserslistTargets,
            outputDirectory,
            postcssPlugins,
            postcssProcessOptions,
            postcssPresetEnvOptions,
            postcssCSSModulesOptions,
            rollupInput,
            rollupOutputs,
            rollupPlugins,
            rollupNodeBundle,
            quiltAssetManifestId,
            quiltAssetManifestPath,
            quiltAssetManifestPriority,
            quiltAssetManifestCacheKey,
            quiltAssetBaseUrl,
            quiltAssetOutputRoot,
            quiltAppBrowserEntryContent,
            quiltAppBrowserEntryShouldHydrate,
            quiltAppBrowserEntryCssSelector,
            quiltGraphQLManifestPath,
            quiltInlineEnvironmentVariables,
          },
          {quiltAppBrowser: browserTargets},
        ) => {
          const inlineEnv = env?.inline;

          if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          rollupPlugins?.(async (plugins) => {
            const {rollupReplaceProcessEnv} = await import(
              '../tools/rollup.ts'
            );

            return [
              ...plugins,
              await rollupReplaceProcessEnv({mode: 'production'}),
            ];
          });

          if (!browserTargets) return;

          rollupNodeBundle?.((currentBundle) => {
            return {
              ...(typeof currentBundle === 'boolean' ? {} : currentBundle),
              builtins: false,
              dependencies: true,
              devDependencies: true,
              peerDependencies: true,
            };
          });

          runtimes(() => [{target: 'browser'}]);

          const targetFilenamePart = `.${browserTargets.name}`;

          browserslistTargets?.(() => browserTargets.targets);

          quiltAssetManifestId?.((id) => id ?? browserTargets.name);

          quiltAssetManifestPath?.(() =>
            project.fs.buildPath(`manifests/assets${targetFilenamePart}.json`),
          );

          quiltGraphQLManifestPath?.(() =>
            project.fs.buildPath(`manifests/graphql${targetFilenamePart}.json`),
          );

          quiltAssetManifestPriority?.(
            (priority) => priority ?? browserTargets.priority,
          );

          quiltAssetManifestCacheKey?.((cacheKey) => ({
            browserGroup: browserTargets.name,
            ...cacheKey,
          }));

          postcssPresetEnvOptions?.((options) => ({
            ...options,
            features: {
              ...options.features,
              'nesting-rules': true,
            },
          }));

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          rollupPlugins?.(async (plugins) => {
            const [
              {visualizer},
              {magicBrowserEntry},
              {cssRollupPlugin},
              {systemJs},
            ] = await Promise.all([
              import('rollup-plugin-visualizer'),
              import('./rollup/magic-browser-entry.ts'),
              import('./rollup/css.ts'),
              import('./rollup/system-js.ts'),
            ]);

            plugins.unshift(
              magicBrowserEntry({
                ...browser,
                project,
                module: MAGIC_ENTRY_MODULE,
                cssSelector: () => quiltAppBrowserEntryCssSelector!.run(),
                shouldHydrate: () => quiltAppBrowserEntryShouldHydrate!.run(),
                customizeContent: (content) =>
                  quiltAppBrowserEntryContent!.run(content),
              }),
            );

            plugins.push(
              systemJs({minify: assets.minify}),
              cssRollupPlugin({
                minify: assets.minify,
                extract: true,
                postcssPlugins: () => postcssPlugins!.run(),
                postcssProcessOptions: () => postcssProcessOptions!.run(),
                postcssCSSModulesOptions: (options) =>
                  postcssCSSModulesOptions!.run(options),
              }),
            );

            if (assets.minify) {
              const {minify} = await import('rollup-plugin-esbuild');
              plugins.push(minify());
            }

            plugins.push(
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

            return plugins;
          });

          rollupOutputs?.(async (outputs) => {
            const [outputRoot, assetBaseUrl, isESM] = await Promise.all([
              outputDirectory.run(project.fs.buildPath()),
              quiltAssetBaseUrl!.run(),
              browserTargets
                ? targetsSupportModules(browserTargets.targets)
                : Promise.resolve(true),
            ]);

            const defaultAssetDirectory =
              assetBaseUrl.startsWith('/') ||
              !assetBaseUrl.startsWith(workspace.fs.root)
                ? assetBaseUrl.slice(1)
                : 'assets';

            const assetOutputRoot = await quiltAssetOutputRoot!.run(
              defaultAssetDirectory,
            );

            outputs.push({
              format: isESM ? 'esm' : 'systemjs',
              dir: path.resolve(outputRoot, assetOutputRoot),
              entryFileNames: `app${targetFilenamePart}.[hash].js`,
              assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
              chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
              manualChunks: createManualChunksSorter({project, workspace}),
            });

            return outputs;
          });
        },
      );

      run(async (step, {configuration}) => {
        const steps: ReturnType<typeof step>[] = [];

        const {quiltAppBrowserTargets} = await configuration();

        const targets = await quiltAppBrowserTargets!.run();

        steps.push(
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
                rm(project.fs.buildPath('public'), {
                  recursive: true,
                  force: true,
                }),
                rm(project.fs.buildPath('server'), {
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
        );

        for (const [index, {name, browsers}] of targets.entries()) {
          if (browsers.length === 0) continue;

          const normalizedName = name === 'defaults' ? 'default' : name;

          steps.push(
            step({
              name: STEP_NAME,
              label: `Build app ${project.name} (browser targets: ${normalizedName})`,
              async run() {
                const [configure, {buildWithRollup}] = await Promise.all([
                  configuration({
                    quiltAppBrowser: {
                      name: normalizedName,
                      targets: browsers,
                      priority: index,
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

let esmBrowserslist: Set<string>;

async function targetsSupportModules(targets: string[]) {
  if (esmBrowserslist == null) {
    const {default: browserslist} = await import('browserslist');

    esmBrowserslist = new Set(browserslist(BROWSERSLIST_MODULES_QUERY));
  }

  return targets.every((target) => esmBrowserslist.has(target));
}

const FRAMEWORK_CHUNK_NAME = 'framework';
const POLYFILLS_CHUNK_NAME = 'polyfills';
const VENDOR_CHUNK_NAME = 'vendor';
const INTERNALS_CHUNK_NAME = 'internals';
const SHARED_CHUNK_NAME = 'shared';
const PACKAGES_CHUNK_NAME = 'packages';
const GLOBAL_CHUNK_NAME = 'global';
const FRAMEWORK_TEST_STRINGS: (string | RegExp)[] = [
  '/node_modules/preact/',
  '/node_modules/react/',
  '/node_modules/js-cookie/',
  '/node_modules/@quilted/quilt/',
  '/node_modules/@preact/signals/',
  '/node_modules/@preact/signals-core/',
  // TODO I should turn this into an allowlist
  /node_modules[/]@quilted[/](?!react-query|swr)/,
];

const POLYFILL_TEST_STRINGS = [
  '/node_modules/@quilted/polyfills/',
  '/node_modules/core-js/',
  '/node_modules/whatwg-fetch/',
  '/node_modules/regenerator-runtime/',
  '/node_modules/abort-controller/',
];

const INTERNALS_TEST_STRINGS = [
  '\x00commonjsHelpers.js',
  '/node_modules/@babel/runtime/',
];

// When building from source, quilt packages are not in node_modules,
// so we instead add their repo paths to the list of framework test strings.
if (process.env.QUILT_FROM_SOURCE) {
  FRAMEWORK_TEST_STRINGS.push('/quilt/packages/');
}

// Inspired by Vite: https://github.com/vitejs/vite/blob/c69f83615292953d40f07b1178d1ed1d72abe695/packages/vite/source/node/build.ts#L567
function createManualChunksSorter({
  project,
  workspace,
}: {
  project: Project;
  workspace: Workspace;
}): GetManualChunk {
  // TODO: make this more configurable, and make it so that we bundle more intelligently
  // for split entries
  const packagesPath = workspace.fs.resolvePath('packages') + path.sep;
  const globalPath = workspace.fs.resolvePath('global') + path.sep;
  const sharedPath = project.fs.resolvePath('shared') + path.sep;

  return (id, {getModuleInfo}) => {
    if (INTERNALS_TEST_STRINGS.some((test) => id.includes(test))) {
      return INTERNALS_CHUNK_NAME;
    }

    if (
      FRAMEWORK_TEST_STRINGS.some((test) =>
        typeof test === 'string' ? id.includes(test) : test.test(id),
      )
    ) {
      return FRAMEWORK_CHUNK_NAME;
    }

    if (POLYFILL_TEST_STRINGS.some((test) => id.includes(test))) {
      return POLYFILLS_CHUNK_NAME;
    }

    let bundleBaseName: string | undefined;
    let relativeId: string | undefined;

    if (id.includes('/node_modules/')) {
      const moduleInfo = getModuleInfo(id);

      // If the only dependency is another vendor, let Rollup handle the naming
      if (moduleInfo == null) return;
      if (
        moduleInfo.importers.length > 0 &&
        moduleInfo.importers.every((importer) =>
          importer.includes('/node_modules/'),
        )
      ) {
        return;
      }

      bundleBaseName = VENDOR_CHUNK_NAME;
      relativeId = id.replace(/^.*[/]node_modules[/]/, '');
    } else if (id.startsWith(packagesPath)) {
      bundleBaseName = PACKAGES_CHUNK_NAME;
      relativeId = id.replace(packagesPath, '');
    } else if (id.startsWith(globalPath)) {
      bundleBaseName = GLOBAL_CHUNK_NAME;
      relativeId = id.replace(globalPath, '');
    } else if (id.startsWith(sharedPath)) {
      bundleBaseName = SHARED_CHUNK_NAME;
      relativeId = id.replace(sharedPath, '');
    }

    if (bundleBaseName == null || relativeId == null) {
      return;
    }

    return `${bundleBaseName}-${relativeId.split(path.sep)[0]?.split('.')[0]}`;
  };
}

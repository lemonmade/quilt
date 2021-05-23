import * as path from 'path';

import type {Plugin, PreRenderedChunk} from 'rollup';
import {createFilter} from '@rollup/pluginutils';
import {
  WebApp,
  createProjectPlugin,
  createProjectBuildPlugin,
  Service,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildServiceConfigurationHooks,
  DevServiceConfigurationHooks,
} from '@sewing-kit/hooks';
import type {} from '@sewing-kit/plugin-rollup';
import type {} from '@quilted/workers/sewing-kit';

import {getEntry} from './shared';

export function rollupBaseConfiguration<
  ProjectType extends WebApp | Service
>() {
  return createProjectPlugin<ProjectType>(
    'Quilt.RollupBaseConfiguration',
    ({tasks}) => {
      function addDefaultConfiguration(
        configuration:
          | BuildWebAppConfigurationHooks
          | DevWebAppConfigurationHooks
          | BuildServiceConfigurationHooks
          | DevServiceConfigurationHooks,
      ) {
        configuration.rollupPlugins?.hook(async (plugins) => {
          const defaultPlugins = await defaultRollupPlugins(configuration);
          return [...plugins, ...defaultPlugins];
        });
      }

      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook(addDefaultConfiguration);
        });
      });

      // eslint-disable-next-line no-warning-comments
      // TODO: dev needs targets too!
      tasks.dev.hook(({hooks}) => {
        hooks.configure.hook(addDefaultConfiguration);
      });
    },
  );
}

export function newRollupBuild() {
  return createProjectBuildPlugin(
    'Quilt.Rollup.Build',
    ({api, hooks, project}) => {
      hooks.target.hook(({target, hooks}) => {
        hooks.steps.hook((steps, configuration) => [
          ...steps,
          api.createStep(
            {
              id: 'Rollup.Build',
              label: `bundling ${project.name} with rollup (target: ${target.options})`,
            },
            async () => {
              const [{rollup}, input, plugins, external] = await Promise.all([
                import('rollup'),
                configuration.rollupInput!.run([]),
                configuration.rollupPlugins!.run([]),
                configuration.rollupExternal!.run([]),
              ]);

              const [inputOptions, outputs] = await Promise.all([
                configuration.rollupInputOptions!.run({
                  input,
                  plugins,
                  external,
                }),
                configuration.rollupOutputs!.run([]),
              ]);

              if (
                (inputOptions.input ?? []).length === 0 ||
                outputs.length === 0
              ) {
                return;
              }

              const bundle = await rollup(inputOptions);
              await Promise.all(outputs.map((output) => bundle.write(output)));
              await bundle.close();
            },
          ),
        ]);
      });
    },
  );
}

export function rollupBaseWorkerConfiguration() {
  return createProjectPlugin<WebApp>(
    'Quilt.RollupBaseConfiguration.Workers',
    ({tasks, project, workspace}) => {
      function addDefaultConfiguration(
        configuration:
          | BuildWebAppConfigurationHooks
          | DevWebAppConfigurationHooks,
      ) {
        configuration.quiltWorkerRollupPlugins?.hook(async (plugins) => {
          const defaultPlugins = await defaultRollupPlugins(configuration);
          return [...plugins, ...defaultPlugins];
        });

        configuration.quiltWorkerRollupOutputOptions?.hook((outputOptions) => ({
          ...outputOptions,
          dir: workspace.fs.buildPath(
            workspace.webApps.length > 1 ? `apps/${project.name}` : 'app',
            'assets',
          ),
        }));
      }

      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook(addDefaultConfiguration);
        });
      });

      // eslint-disable-next-line no-warning-comments
      // TODO: dev needs targets too!
      tasks.dev.hook(({hooks}) => {
        hooks.configure.hook(addDefaultConfiguration);
      });
    },
  );
}
export function rollupServiceRollupOutputs() {
  return createProjectPlugin<Service>(
    'Quilt.RollupServiceOutputs',
    ({tasks, project, workspace}) => {
      function addDefaultConfiguration(
        configuration: BuildServiceConfigurationHooks,
      ) {
        configuration.rollupInput?.hook(async (inputs) => {
          if (inputs.length) return inputs;

          return [await getEntry(project)];
        });

        configuration.rollupInputOptions?.hook((inputOptions) => ({
          ...inputOptions,
          preserveEntrySignatures: false,
        }));

        configuration.rollupOutputs?.hook((outputs) => {
          if (outputs.length > 0) return outputs;

          return [
            {
              format: 'commonjs',
              entryFileNames: 'index.js',
              chunkFileNames: chunkFilename,
              dir: workspace.fs.buildPath(
                workspace.services.length > 1
                  ? `services/${project.name}`
                  : 'service',
              ),
            },
          ];
        });
      }

      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook(addDefaultConfiguration);
        });
      });
    },
  );
}

const REPLACEMENT_PATH_SEPARATOR = '_';
const MAXIMUM_CHUNK_FILENAME_LENGTH = 50;

function chunkFilename(chunk: PreRenderedChunk) {
  if (chunk.facadeModuleId) {
    return `${extractNodeModuleName(chunk.facadeModuleId)}.[hash].js`;
  }

  const filenameModules: string[] = [];
  let filenameLength = 0;

  for (const moduleId of Object.keys(chunk.modules)) {
    const reservedForComma = filenameModules.length === 0 ? 0 : 1;
    const filenamePart = extractNodeModuleName(moduleId);
    const reducedFilenamePart = filenamePart.substring(
      0,
      MAXIMUM_CHUNK_FILENAME_LENGTH - filenameLength - reservedForComma,
    );

    if (reducedFilenamePart.length / filenamePart.length < 0.6) {
      break;
    }

    if (filenameModules.includes(reducedFilenamePart)) {
      continue;
    }

    filenameModules.push(reducedFilenamePart);

    filenameLength += reducedFilenamePart.length;
    filenameLength += reservedForComma;

    if (filenameLength >= MAXIMUM_CHUNK_FILENAME_LENGTH) {
      break;
    }
  }

  return `${filenameModules.join(',')}.[hash].js`;
}

function extractNodeModuleName(moduleId: string) {
  const moduleParts = moduleId.split(path.sep);
  const nodeModuleIndex = moduleParts.lastIndexOf('node_modules');

  if (nodeModuleIndex < 0) {
    return moduleParts.slice(0, 3).join(REPLACEMENT_PATH_SEPARATOR);
  }

  const [nodeModuleName, nextPathPart] = moduleParts.slice(
    nodeModuleIndex + 1,
    nodeModuleIndex + 3,
  );

  return nodeModuleName.startsWith('@')
    ? `${nodeModuleName}${REPLACEMENT_PATH_SEPARATOR}${nextPathPart}`
    : nodeModuleName;
}

async function defaultRollupPlugins({
  babelConfig,
}:
  | BuildWebAppConfigurationHooks
  | DevWebAppConfigurationHooks
  | BuildServiceConfigurationHooks
  | DevServiceConfigurationHooks) {
  const [
    {default: commonjs},
    {default: json},
    {default: nodeResolve},
    {default: esbuild},
    babel,
  ] = await Promise.all([
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-node-resolve'),
    import('rollup-plugin-esbuild'),
    babelConfig!.run({presets: [], plugins: []}),
  ]);

  return [
    nodeResolve({
      exportConditions: ['esnext', 'import', 'require', 'default'],
      extensions: ['.tsx', '.ts', '.esnext', '.mjs', '.js', '.json'],
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
    esbuildWithBabel({babel, minify: false}),
    esbuild({
      include: /\.esnext$/,
      // Allows node_modules
      exclude: [],
      minify: false,
      target: 'node12',
      loaders: {
        '.esnext': 'js',
      },
    }),
  ];
}

const ESBUILD_MATCH = /\.(ts|js)x?$/;
const REMOVE_BABEL_PRESETS = ['@babel/preset-env', '@babel/preset-typescript'];

function esbuildLoader(id: string) {
  return id.match(ESBUILD_MATCH)?.[1] as 'js' | 'ts' | undefined;
}

function esbuildWithBabel({
  babel,
  ...options
}: import('esbuild').TransformOptions & {
  babel: import('@babel/core').TransformOptions;
}): Plugin {
  const filter = createFilter(/\.(ts|tsx|js|jsx)$/, /node_modules/);

  return {
    name: '@quilted/esbuild-with-babel',
    async transform(code, id) {
      if (!filter(id)) return null;

      const loader = esbuildLoader(id);

      if (loader == null) return null;

      const [
        {transformAsync: transformWithBabel},
        {transform: transformWithESBuild},
      ] = await Promise.all([import('@babel/core'), import('esbuild')]);

      const {code: intermediateCode} =
        (await transformWithBabel(code, {
          ...babel,
          filename: id,
          sourceType: 'module',
          configFile: false,
          babelrc: false,
          presets: babel.presets?.filter((preset) => {
            let resolvedPreset: string;

            if (typeof preset === 'string') {
              resolvedPreset = preset;
            } else if (Array.isArray(preset) && typeof preset[0] === 'string') {
              resolvedPreset = preset[0];
            } else {
              return true;
            }

            return !REMOVE_BABEL_PRESETS.some((removePreset) =>
              resolvedPreset.includes(removePreset),
            );
          }),
          plugins:
            loader === 'ts'
              ? [
                  ...(babel.plugins ?? []),
                  ['@babel/plugin-syntax-typescript', {isTSX: true}],
                ]
              : babel.plugins,
        })) ?? {};

      if (intermediateCode == null) {
        return {code: intermediateCode ?? undefined};
      }

      const {code: finalCode, map} = await transformWithESBuild(
        intermediateCode,
        {
          ...options,
          target: 'es2017',
          loader,
          minify: false,
        },
      );

      return {code: finalCode || undefined, map: map || null};
    },
  };
}

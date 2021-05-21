import type {Plugin} from 'rollup';
import {WebApp, createProjectPlugin, Service} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildServiceConfigurationHooks,
  DevServiceConfigurationHooks,
} from '@sewing-kit/hooks';
import type {} from '@sewing-kit/plugin-rollup';
import type {} from '@quilted/workers-rollup/sewing-kit';

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

async function defaultRollupPlugins({
  babelConfig,
}:
  | BuildWebAppConfigurationHooks
  | DevWebAppConfigurationHooks
  | BuildServiceConfigurationHooks
  | DevServiceConfigurationHooks) {
  const [
    {default: commonjs},
    {default: nodeResolve},
    {default: esbuild},
    babel,
  ] = await Promise.all([
    import('@rollup/plugin-commonjs'),
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
    esbuildWithBabel({babel, minify: false}),
    esbuild({
      include: /\.json$/,
      minify: false,
    }),
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
  return {
    name: '@watching/esbuild-with-jsx-runtime',
    async transform(code, id) {
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
                  [['@babel/plugin-syntax-typescript', {isTSX: true}]],
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

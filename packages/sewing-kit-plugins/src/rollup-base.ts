import type {Plugin} from 'rollup';
import {WebApp, createProjectPlugin, Service} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildServiceConfigurationHooks,
  DevServiceConfigurationHooks,
} from '@sewing-kit/hooks';
import type {} from '@sewing-kit/plugin-rollup';

export function rollupBaseConfiguration<
  ProjectType extends WebApp | Service
>() {
  return createProjectPlugin<ProjectType>('Quilt.HttpHandler', ({tasks}) => {
    function addDefaultConfiguration() {
      return ({
        rollupPlugins,
        babelConfig,
      }:
        | BuildWebAppConfigurationHooks
        | DevWebAppConfigurationHooks
        | BuildServiceConfigurationHooks
        | DevServiceConfigurationHooks) => {
        rollupPlugins?.hook(async (plugins) => {
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
            ...plugins,
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
        });
      };
    }

    tasks.build.hook(({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(addDefaultConfiguration());
      });
    });

    // eslint-disable-next-line no-warning-comments
    // TODO: dev needs targets too!
    tasks.dev.hook(({hooks}) => {
      hooks.configure.hook(addDefaultConfiguration());
    });
  });
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

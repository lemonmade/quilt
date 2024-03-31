import * as path from 'path';

import {type InputPluginOption, type RollupOptions} from 'rollup';

import {Project} from './shared/project.ts';
import {
  RollupNodePluginOptions,
  getNodePlugins,
  removeBuildFiles,
} from './shared/rollup.ts';

import {multiline} from './shared/strings.ts';
import {resolveEnvOption, type MagicModuleEnvOptions} from './features/env.ts';
import {MAGIC_MODULE_ENTRY, MAGIC_MODULE_REQUEST_ROUTER} from './constants.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';
import type {ModuleRuntime} from './module.ts';

export interface ServerOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this server. By default, this module must export
   * a `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure. If you set the format to `'custom'`,
   * this entry can be any content — it will be bundled as-is.
   *
   * If not provided, this will default to a file named `server`, `service`,
   * or `backend` in your server’s root directory.
   */
  entry?: string;

  /**
   * Whether this server code uses the `request-router` library to
   * define itself in a generic way, which can be adapted to a variety
   * of environments. By default, this is `'request-router'`, and when `'request-router'`,
   * the `entry` you specified must export an `RequestRouter` object as
   * its default export. When set to `false`, the app server will be built
   * as a basic server-side JavaScript project, without the special
   * `request-router` adaptor.
   *
   * @default 'request-router'
   */
  format?: 'request-router' | 'custom';

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * Customizes the behavior of environment variables for your module.
   */
  env?: MagicModuleEnvOptions | MagicModuleEnvOptions['mode'];

  /**
   * Controls how the server outputs are generated.
   */
  output?: ServerOutputOptions;

  /**
   * Customizations to the server for the runtime it will execute in.
   */
  runtime?: ServerRuntime;
}

export interface ServerRuntime extends ModuleRuntime {
  /**
   * A string that will be inlined directly as code to reference a runtime constant
   * that contains environment variables.
   */
  env?: string;

  /**
   * The content to use as the entry point when the server uses the `request-router`
   * format for their server. This file should import the request router instance for
   * this app from 'quilt:module/request-router', and create a server that is appropriate
   * for this runtime.
   */
  requestRouter?(): string;
}

export interface ServerOutputOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
  /**
   * The directory to output the server into.
   *
   * @default 'build/server'
   */
  directory?: string;

  /**
   * Whether to minify assets created for this server.
   *
   * @default false
   */
  minify?: boolean;

  /**
   * Whether to add a hash to the output files for your server. You can set
   * this to `true`, which includes a hash for all files, `false`, which never
   * includes a hash, or `'async-only'`, which only includes a hash for files
   * that are loaded asynchronously (that is, your entry file will not have a
   * hash, but any files it loads will).
   *
   * @default 'async-only'
   */
  hash?: boolean | 'async-only';
}

export {MAGIC_MODULE_ENTRY, MAGIC_MODULE_REQUEST_ROUTER};

export async function quiltServer({
  root: rootPath = process.cwd(),
  entry,
  format = 'request-router',
  env,
  graphql = true,
  output,
  runtime = nodeServerRuntime(),
}: ServerOptions = {}) {
  const project = Project.load(rootPath);
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const outputDirectory = project.resolve(
    output?.directory ?? runtime.output?.directory ?? 'build/output',
  );
  const reportDirectory = path.resolve(outputDirectory, '../reports');

  const minify = output?.minify ?? false;
  const bundle = output?.bundle ?? runtime.output?.bundle;
  const hash = output?.hash ?? 'async-only';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {tsconfigAliases},
    {monorepoPackageAliases},
    {react},
    {esnext},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/node.ts'),
    import('./features/react.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({
      bundle,
      resolve: {exportConditions: runtime.resolve?.exportConditions},
    }),
  ]);

  const serverEntry = entry
    ? project.resolve(entry)
    : await sourceForServer(project);

  const finalEntry =
    format === 'request-router'
      ? MAGIC_MODULE_ENTRY
      : serverEntry ?? MAGIC_MODULE_ENTRY;

  const finalEntryName = serverEntry
    ? path.basename(serverEntry).split('.').slice(0, -1).join('.')
    : 'server';

  const plugins: InputPluginOption[] = [
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({
      runtime: runtime.env,
      ...resolveEnvOption(env),
      mode,
      root: project.root,
    }),
    sourceCode({mode, targets: ['current node']}),
    tsconfigAliases({root: project.root}),
    monorepoPackageAliases({root: project.root}),
    react(),
    esnext({mode, targets: ['current node']}),
    removeBuildFiles([outputDirectory, reportDirectory], {root: project.root}),
  ];

  if (format === 'request-router') {
    plugins.push(
      createMagicModulePlugin({
        name: '@quilted/magic-module/server-request-router',
        module: MAGIC_MODULE_REQUEST_ROUTER,
        alias: serverEntry,
      }),
      createMagicModulePlugin({
        name: '@quilted/request-router',
        sideEffects: true,
        module: MAGIC_MODULE_ENTRY,
        source() {
          return (
            runtime.requestRouter?.() ?? nodeServerRuntime().requestRouter()
          );
        },
      }),
    );
  }

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: path.join(reportDirectory, 'bundle-visualizer.html'),
    }),
  );

  return {
    input: {[finalEntryName]: finalEntry},
    plugins,
    output: {
      format: 'esm',
      dir: outputDirectory,
      entryFileNames: `[name]${hash === true ? `.[hash]` : ''}.js`,
      chunkFileNames: `[name]${
        hash === true || hash === 'async-only' ? `.[hash]` : ''
      }.js`,
      assetFileNames: `[name]${hash === true ? `.[hash]` : ''}.[ext]`,
      generatedCode: 'es2015',
      ...runtime.output?.options,
    },
  } satisfies RollupOptions;
}

export interface NodeServerRuntimeOptions {
  /**
   * The port that the server will listen on when it runs.
   *
   * If you do not provide a value, the server will listen for
   * requests on the port specified by `process.env.NODE_ENV`.
   */
  port?: number | string;

  /**
   * The host that the server will listen on when it runs.
   */
  host?: string;

  /**
   * What module format to use for the server output.
   *
   * @default 'module'
   */
  format?:
    | 'module'
    | 'modules'
    | 'esmodules'
    | 'esm'
    | 'es'
    | 'commonjs'
    | 'cjs';
}

export function nodeServerRuntime({
  host,
  port,
  format = 'module',
}: NodeServerRuntimeOptions = {}) {
  return {
    env: 'process.env',
    output: {
      options: {
        format: format === 'commonjs' || format === 'cjs' ? 'cjs' : 'esm',
      },
    },
    resolve: {
      exportConditions: ['node'],
    },
    requestRouter() {
      return multiline`
        import requestRouter from ${JSON.stringify(
          MAGIC_MODULE_REQUEST_ROUTER,
        )};

        import {createHttpServer} from '@quilted/quilt/request-router/node';

        const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
        const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};
      
        createHttpServer(requestRouter).listen(port, host);
      `;
    },
  } satisfies ServerRuntime;
}

async function sourceForServer(project: Project) {
  const {main, exports} = project.packageJSON.raw;

  const entryFromPackageJSON = main ?? (exports as any)?.['.'];

  if (entryFromPackageJSON) {
    return project.resolve(entryFromPackageJSON);
  }

  const possibleSourceFiles = await project.glob(
    '{index,server,service,backend,entry,input}.{ts,tsx,mjs,js,jsx}',
    {
      nodir: true,
      absolute: true,
    },
  );

  return possibleSourceFiles[0]!;
}

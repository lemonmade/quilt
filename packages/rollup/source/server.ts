import * as path from 'path';
import {Plugin, type RollupOptions} from 'rollup';
import {glob} from 'glob';

import {
  RollupNodePluginOptions,
  getNodePlugins,
  removeBuildFiles,
} from './shared/rollup.ts';
import {resolveRoot} from './shared/path.ts';
import {loadPackageJSON, type PackageJSON} from './shared/package-json.ts';
import {magicModuleRequestRouterEntry} from './features/request-router.ts';
import {resolveEnvOption, type MagicModuleEnvOptions} from './features/env.ts';
import {MAGIC_MODULE_ENTRY, MAGIC_MODULE_REQUEST_ROUTER} from './constants.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';

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
   * The port that the server will listen on when it runs. This only applies
   * when you use the `request-router` format — if you use the `custom` format,
   * you are responsible for starting the server yourself.
   *
   * If you do not provide a value here, the server will listen for requests on
   * the port specified by `process.env.NODE_ENV`.
   */
  port?: number | string;

  /**
   * The host that the server will listen on when it runs. This only applies
   * when you use the `request-router` format — if you use the `custom` format,
   * you are responsible for starting the server yourself.
   */
  host?: string;
}

export interface ServerOutputOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
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

  /**
   * What module format to use for the server output.
   *
   * @default 'esmodules'
   */
  format?: 'esmodules' | 'esm' | 'es' | 'commonjs' | 'cjs';
}

export async function quiltServer({
  root: rootPath = process.cwd(),
  entry,
  format = 'request-router',
  env,
  graphql = true,
  output,
  port,
  host,
}: ServerOptions = {}) {
  const root = resolveRoot(rootPath);
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const outputDirectory = path.join(root, 'build/server');

  const minify = output?.minify ?? false;
  const bundle = output?.bundle;
  const hash = output?.hash ?? 'async-only';
  const outputFormat = output?.format ?? 'esmodules';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {esnext},
    nodePlugins,
    packageJSON,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({bundle}),
    loadPackageJSON(root),
  ]);

  const serverEntry = entry
    ? path.resolve(root, entry)
    : await sourceForServer(root, packageJSON);

  const finalEntry =
    format === 'request-router'
      ? MAGIC_MODULE_ENTRY
      : serverEntry ?? MAGIC_MODULE_ENTRY;

  const plugins: Plugin[] = [
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({...resolveEnvOption(env), mode}),
    sourceCode({mode, targets: ['current node']}),
    esnext({mode, targets: ['current node']}),
    removeBuildFiles(['build/server', 'build/reports'], {root}),
  ];

  if (format === 'request-router') {
    plugins.push(
      createMagicModulePlugin({
        name: '@quilted/magic-module/server-request-router',
        module: MAGIC_MODULE_REQUEST_ROUTER,
        alias: serverEntry,
      }),
      magicModuleRequestRouterEntry({
        host,
        port: typeof port === 'string' ? Number.parseInt(port, 10) : port,
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
      filename: path.resolve(root, `build/reports/bundle-visualizer.html`),
    }),
  );

  return {
    input: finalEntry,
    plugins,
    onwarn(warning, defaultWarn) {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        /['"]use client['"]/.test(warning.message)
      ) {
        return;
      }

      defaultWarn(warning);
    },
    output: {
      format:
        outputFormat === 'commonjs' || outputFormat === 'cjs' ? 'cjs' : 'esm',
      dir: outputDirectory,
      entryFileNames: `server${hash === true ? `.[hash]` : ''}.js`,
      chunkFileNames: `[name]${
        hash === true || hash === 'async-only' ? `.[hash]` : ''
      }.js`,
      assetFileNames: `[name]${hash === true ? `.[hash]` : ''}.[ext]`,
      generatedCode: 'es2015',
    },
  } satisfies RollupOptions;
}

async function sourceForServer(root: string, packageJSON: PackageJSON) {
  const {main, exports} = packageJSON;

  const entryFromPackageJSON = main ?? (exports as any)?.['.'];

  if (entryFromPackageJSON) {
    return path.resolve(root, entryFromPackageJSON);
  }

  const possibleSourceFiles = await glob(
    '{index,server,service,backend,entry,input}.{ts,tsx,mjs,js,jsx}',
    {
      cwd: root,
      nodir: true,
      absolute: true,
    },
  );

  return possibleSourceFiles[0]!;
}

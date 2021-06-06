import {unlinkSync} from 'fs';
import {dirname, basename} from 'path';
import {access} from 'fs/promises';

import glob from 'globby';

import type {ProjectPlugin, WorkspacePlugin} from '../plugins';
import {Package, App, Service, Workspace, Project} from '../model';
import {DiagnosticError} from '../errors';

import {
  ConfigurationBuilderResult,
  BUILDER_RESULT_MARKER,
  ConfigurationKind,
} from './base';

const DIRECTORIES_NOT_TO_USE_FOR_NAME = new Set(['src', 'source', 'lib']);

interface LoadedConfigurationFile<Options>
  extends ConfigurationBuilderResult<Options> {
  readonly file: string;
}

export interface LoadedWorkspace {
  readonly workspace: Workspace;
  readonly plugins: {
    for<Target extends Workspace | Project>(
      target: Target,
    ): Target extends Project
      ? readonly ProjectPlugin<Target>[]
      : readonly WorkspacePlugin[];
  };
}

export async function loadWorkspace(root: string): Promise<LoadedWorkspace> {
  const packages = new Set<Package>();
  const apps = new Set<App>();
  const services = new Set<Service>();
  const pluginMap = new Map<
    Workspace | Project,
    readonly (WorkspacePlugin | ProjectPlugin<any>)[]
  >();

  const configFiles = await glob('**/sewing-kit.config.*', {
    cwd: root,
    ignore: ['**/node_modules/**', '**/build/**'],
    absolute: true,
  });

  const loadedConfigs = (
    await Promise.all(configFiles.map((config) => loadConfig(config)))
  ).filter((config) => Boolean(config)) as LoadedConfigurationFile<{
    name: string;
    root: string;
  }>[];

  const workspaceConfigs = loadedConfigs.filter(
    (config) =>
      config.workspacePlugins.length > 0 ||
      config.kind === ConfigurationKind.Workspace,
  );

  if (workspaceConfigs.length > 1) {
    // needs a better error, showing files/ what workspace plugins exist
    throw new DiagnosticError({
      title: `Multiple workspace configurations found`,
      content: `Found ${workspaceConfigs.length} workspace configurations. Only one sewing-kit config can declare workspace plugins and/ or use the createWorkspace() utility from @sewing-kit/config`,
    });
  }

  const [workspaceConfig] = workspaceConfigs;

  if (
    workspaceConfig?.workspacePlugins.length > 0 &&
    workspaceConfig.kind !== ConfigurationKind.Workspace &&
    loadedConfigs.length > 1
  ) {
    // needs a better error, showing which project
    throw new DiagnosticError({
      title: `Invalid workspace plugins in project configuration`,
      content: `You declared workspace plugins in a project, but this is only supported for workspace with a single project.`,
      suggestion: `Move the workspace plugins to a root sewing-kit config file, and include them using the createWorkspace() function from @sewing-kit/config`,
    });
  }

  for (const {kind, options, projectPlugins} of loadedConfigs) {
    switch (kind) {
      case ConfigurationKind.Package: {
        const pkg = new Package({
          entries: [],
          ...options,
        } as any);
        packages.add(pkg);
        pluginMap.set(pkg, projectPlugins);
        break;
      }
      case ConfigurationKind.App: {
        const app = new App({entry: './index', ...options} as any);
        apps.add(app);
        pluginMap.set(app, projectPlugins);
        break;
      }
      case ConfigurationKind.Service: {
        const service = new Service({entry: './index', ...options} as any);
        services.add(service);
        pluginMap.set(service, projectPlugins);
        break;
      }
    }
  }

  const workspace = new Workspace({
    root: root as string,
    name: basename(root as string),
    ...(workspaceConfig?.options ?? {}),
    apps: [...apps],
    packages: [...packages],
    services: [...services],
  });

  if (workspaceConfig?.workspacePlugins) {
    pluginMap.set(workspace, workspaceConfig.workspacePlugins);
  }

  return {
    workspace,
    plugins: {
      for(target) {
        return (pluginMap.get(target) as any) ?? [];
      },
    },
  };
}

async function loadConfig<
  T extends {name: string; root: string} = {name: string; root: string},
>(file: string) {
  if (
    !(await access(file)
      .then(() => true)
      .catch(() => false))
  ) {
    throw new DiagnosticError({
      title: `No config file found at ${file}`,
      suggestion:
        'Make sure you have specified the --config flag to point at a valid workspace config file.',
    });
  }

  return loadConfigFile<T>(file);
}

async function loadConfigFile<Options>(
  file: string,
): Promise<LoadedConfigurationFile<Options> | null> {
  const normalized = await normalizeConfigurationFile(file);

  if (normalized == null) {
    throw new DiagnosticError({
      title: 'Invalid configuration file',
      content: `The configuration file ${file} did not export any configuration`,
      suggestion: file.endsWith('.ts')
        ? `Ensure that you are exporting the result of calling a function from @sewing-kit/config as the default export, then run your command again.`
        : `Ensure that you are setting the result of calling a function from @sewing-kit/config to module.exports, then run your command again.`,
    });
  } else if (typeof normalized !== 'function') {
    throw new DiagnosticError({
      title: 'Invalid configuration file',
      content: `The configuration file ${file} did not export a function`,
      suggestion: `Ensure that you are exporting the result of calling a function from @sewing-kit/config, then run your command again.`,
    });
  }

  const result = await normalized();

  if (!looksLikeValidConfigurationObject(result)) {
    throw new DiagnosticError({
      title: 'Invalid configuration file',
      content: `The configuration file ${file} did not export a function that creates a configuration object`,
      suggestion: `Ensure that you are exporting the result of calling a function from @sewing-kit/config, then run your command again.`,
    });
  }

  const configDir = dirname(file);
  const configDirName = basename(configDir);
  const name = DIRECTORIES_NOT_TO_USE_FOR_NAME.has(configDirName)
    ? basename(dirname(configDir))
    : configDirName;

  const {workspacePlugins, projectPlugins} = result;

  return {
    ...result,
    file,
    workspacePlugins,
    projectPlugins,
    options: {root: configDir, name, ...(result.options as any)},
  };
}

function looksLikeValidConfigurationObject(
  value: unknown,
): value is ConfigurationBuilderResult {
  return (
    typeof value === 'object' && value != null && BUILDER_RESULT_MARKER in value
  );
}

async function normalizeConfigurationFile(file: string) {
  // If it’s a TypeScript file, we compile it to JavaScript,
  // import is as ESM, and delete the JavaScript file. Magic.
  if (/.tsx?$/.test(file)) {
    const [
      {rollup},
      {default: json},
      {default: commonjs},
      {default: nodeResolve},
      {default: esbuild},
    ] = await Promise.all([
      import('rollup'),
      import('@rollup/plugin-json'),
      import('@rollup/plugin-commonjs'),
      import('@rollup/plugin-node-resolve'),
      import('rollup-plugin-esbuild'),
    ]);

    const jsFile = file.replace(/\.tsx?/, '.js');

    const bundle = await rollup({
      input: file,
      external: [/node_modules/],
      plugins: [
        nodeResolve({
          extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
          exportConditions: [
            'quilt:internal',
            'sewing-kit:esnext',
            'module',
            'import',
            'node',
            'require',
            'default',
          ],
        }),
        commonjs(),
        json(),
        esbuild({
          target: 'node14',
        }),
        esbuild({
          target: 'node14',
          include: /\.esnext$/,
          exclude: [],
        }),
      ],
      // Silencing warnings, as long as it runs it’s fine!
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onwarn() {},
    });

    await bundle.write({
      file: jsFile,
      format: 'esm',
    });

    try {
      const {default: defaultExport} = await import(jsFile);
      return defaultExport;
    } finally {
      unlinkSync(jsFile);
    }
  }

  const {default: defaultExport} = await import(file);
  return defaultExport;
}

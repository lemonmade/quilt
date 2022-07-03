import * as path from 'path';
import {unlinkSync} from 'fs';
import {access} from 'fs/promises';

import {globby} from 'globby';

import {Workspace, Project, DiagnosticError} from '../kit';
import type {ProjectPlugin, WorkspacePlugin, PluginCreateHelper} from '../kit';
import type {
  ProjectConfigurationResult,
  WorkspaceConfigurationResult,
} from '../configuration';

type ConfigurationResult =
  | ProjectConfigurationResult
  | WorkspaceConfigurationResult;

export interface LoadedWorkspace {
  readonly workspace: Workspace;
  readonly plugins: {
    for<Target extends Workspace | Project>(
      target: Target,
    ): Target extends Project
      ? readonly ProjectPlugin[]
      : readonly WorkspacePlugin[];
  };
}

export async function loadWorkspace(
  root: string,
  {configurationFile}: {configurationFile?: string} = {},
): Promise<LoadedWorkspace> {
  const projects = new Set<Project>();
  const pluginMap = new Map<
    Workspace | Project,
    readonly (WorkspacePlugin | ProjectPlugin)[]
  >();

  let rootConfiguration: ConfigurationResult | null = null;

  if (configurationFile) {
    const workspaceFile = path.resolve(configurationFile);

    if (
      !(await access(workspaceFile)
        .then(() => true)
        .catch(() => false))
    ) {
      throw new DiagnosticError({
        title: `No configuration file found at ${path.relative(
          process.cwd(),
          workspaceFile,
        )}`,
        suggestion:
          'Make sure you have specified the --config flag to point at a valid workspace configuration file.',
      });
    }

    const loadedConfig = await loadConfig(path.resolve(configurationFile));

    if (loadedConfig == null) {
      throw new DiagnosticError({
        title: 'Invalid configuration file',
        content: `The configuration file ${path.relative(
          process.cwd(),
          workspaceFile,
        )} did not export any configuration`,
        suggestion: `Make sure you are exporting the result of calling a function from @quilted/craft as the default export, then run your command again.`,
      });
    }

    rootConfiguration = loadedConfig;
  }

  if (rootConfiguration == null) {
    const rootConfigurationFileGlob = await globby(
      'quilt.{project,workspace}.{js,ts}',
      {
        cwd: root,
        absolute: true,
      },
    );

    if (rootConfigurationFileGlob.length > 0) {
      const rootConfigurationFile = rootConfigurationFileGlob.sort().pop()!;
      const loadedConfig = await loadConfig(rootConfigurationFile);

      if (loadedConfig == null) {
        throw new DiagnosticError({
          title: 'Invalid configuration file',
          content: `The configuration file ${path.relative(
            process.cwd(),
            rootConfigurationFile,
          )} did not export any configuration`,
          suggestion: `Make sure you are exporting the result of calling a function from @quilted/craft as the default export, then run your command again.`,
        });
      }

      rootConfiguration = loadedConfig;
    }
  }

  const projectPatterns =
    rootConfiguration?.kind === 'workspace' &&
    rootConfiguration.projects.length > 0
      ? rootConfiguration.projects
      : ['**/quilt.{project,workspace}.{js,ts}'];

  const configFiles = await globby(projectPatterns, {
    cwd: root,
    ignore: [
      '**/node_modules/**',
      '**/build/**',
      ...(rootConfiguration ? [rootConfiguration.file] : []),
    ],
    absolute: true,
  });

  // Rollup creates a `process` event listener for each build, and
  // we do one per configuration file in this case. We’ll temporarily
  // remove the limit and reset it later.

  let loadedConfigurations: ConfigurationResult[];
  const maxListeners = process.getMaxListeners();

  try {
    process.setMaxListeners(Infinity);
    loadedConfigurations = (
      await Promise.all(configFiles.map((config) => loadConfig(config)))
    ).filter((config) => Boolean(config)) as typeof loadedConfigurations;
  } finally {
    process.setMaxListeners(maxListeners);
  }

  const workspaceConfigurations: ConfigurationResult[] =
    rootConfiguration?.kind === 'workspace' ? [rootConfiguration] : [];

  for (const configuration of loadedConfigurations) {
    if (
      configuration.kind === 'workspace' ||
      configuration.workspacePlugins.length > 0
    ) {
      workspaceConfigurations.push(configuration);
    }
  }

  if (workspaceConfigurations.length > 1) {
    // needs a better error, showing files/ what workspace plugins exist
    throw new DiagnosticError({
      title: `Multiple workspace configurations found`,
      content: `Found ${workspaceConfigurations.length} workspace configurations. Only one quilt config can declare workspace plugins and/ or use the createWorkspace() utility from @quilted/craft`,
    });
  }

  const [workspaceConfiguration] = workspaceConfigurations;

  for (const configuration of loadedConfigurations) {
    if (configuration.kind === 'workspace') continue;

    const project = new Project({
      root: configuration.root,
      name: configuration.name,
    });

    projects.add(project);
    pluginMap.set(
      project,
      await expandPlugins(configuration.plugins, {fs: project.fs}),
    );
  }

  const workspace = new Workspace({
    root,
    name: workspaceConfiguration?.name
      ? workspaceConfiguration.name
      : path.basename(root),
    projects: [...projects],
  });

  if (workspaceConfiguration) {
    if (workspaceConfiguration.kind === 'workspace') {
      pluginMap.set(
        workspace,
        await expandPlugins(workspaceConfiguration.plugins, {
          fs: workspace.fs,
        }),
      );
    } else {
      pluginMap.set(
        workspace,
        await expandPlugins(workspaceConfiguration.workspacePlugins, {
          fs: workspace.fs,
        }),
      );
    }
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

async function loadConfig(file: string): Promise<ConfigurationResult | null> {
  const normalized = await normalizeConfigurationFile(file);

  if (normalized == null) {
    throw new DiagnosticError({
      title: 'Invalid configuration file',
      content: `The configuration file ${path.relative(
        process.cwd(),
        file,
      )} did not export any configuration`,
      suggestion: `Make sure you are exporting the result of calling a function from @quilted/craft as the default export, then run your command again.`,
    });
  } else if (typeof normalized !== 'function') {
    throw new DiagnosticError({
      title: 'Invalid configuration file',
      content: `The configuration file ${path.relative(
        process.cwd(),
        file,
      )} did not export a function`,
      suggestion: `Ensure that you are exporting the result of calling a function from @quilted/craft, then run your command again.`,
    });
  }

  const root = path.dirname(file);
  const result = await normalized({root, file});

  return result;
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

    const exportConditions = [
      'quilt:esnext',
      'module',
      'import',
      'node',
      'require',
      'default',
    ];

    const fromSource = Boolean(process.env.QUILT_FROM_SOURCE);

    // When building from source, we use a special export condition for
    // some packages that resolves to source code. This allows us to
    // use those packages for the build, without having to build them first.
    if (fromSource) {
      exportConditions.unshift('quilt:from-source');
    }

    const bundle = await rollup({
      input: file,
      external: fromSource ? [/node_modules/, /@quilt/] : [/node_modules/],
      plugins: [
        nodeResolve({
          extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
          exportConditions,
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
      inlineDynamicImports: true,
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

async function expandPlugins<Plugin extends ProjectPlugin | WorkspacePlugin>(
  plugins: Iterable<Plugin>,
  helper: Omit<PluginCreateHelper<Plugin>, 'use'>,
): Promise<Plugin[]> {
  const expanded = await Promise.all(
    [...plugins].map(async (plugin) => {
      if (plugin.create == null) return plugin;

      const usedPlugins: Plugin[] = [];

      await plugin.create({
        ...helper,
        use(...newPlugins: Plugin[]) {
          for (const newPlugin of newPlugins) {
            if (newPlugin) usedPlugins.push(newPlugin);
          }
        },
      } as PluginCreateHelper<Plugin> as any);

      return expandPlugins(usedPlugins, helper);
    }),
  );

  return expanded.flat() as Plugin[];
}

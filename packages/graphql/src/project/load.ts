import {unlinkSync} from 'fs';
import {loadSchema} from '@graphql-tools/load';
import {JsonFileLoader} from '@graphql-tools/json-file-loader';
import {GraphQLFileLoader} from '@graphql-tools/graphql-file-loader';
import {cosmiconfig as createCosmiconfig} from 'cosmiconfig';
import {loadToml} from 'cosmiconfig-toml-loader';

import type {GraphQLConfiguration, GraphQLProjectConfiguration} from './types';
import type {GraphQLProject, GraphQLProjectMap} from '../configuration';

const NAME = 'graphql';

export async function loadConfiguration(
  root: string = process.cwd(),
): Promise<GraphQLConfiguration> {
  const cosmiconfig = createCosmiconfig(NAME, {
    searchPlaces: [
      `${NAME}.config.ts`,
      `${NAME}.config.js`,
      `${NAME}.config.cjs`,
      `${NAME}.config.mjs`,
      `${NAME}.config.json`,
      `${NAME}.config.yaml`,
      `${NAME}.config.yml`,
      `${NAME}.config.toml`,
      `.${NAME}rc`,
      `.${NAME}rc.ts`,
      `.${NAME}rc.js`,
      `.${NAME}rc.cjs`,
      `.${NAME}rc.mjs`,
      `.${NAME}rc.json`,
      `.${NAME}rc.yml`,
      `.${NAME}rc.yaml`,
      `.${NAME}rc.toml`,
      `package.json`,
    ],
    loaders: {
      '.ts': loadTypeScript,
      '.js': loadJavaScript,
      '.mjs': loadJavaScript,
      '.toml': loadToml,
    },
    stopDir: root,
  });

  const result = await cosmiconfig.search(root);

  if (result == null || result.isEmpty) {
    return {
      projects: {},
    };
  }

  const {config} = result;

  const graphqlFileLoader = new GraphQLFileLoader();
  const jsonFileLoader = new JsonFileLoader();

  const normalizeConfiguration = (
    name: string,
    {schema, documents, exclude, extensions = {}}: GraphQLProject,
  ): GraphQLProjectConfiguration => {
    return {
      name,
      root,
      extensions,
      schemaPatterns: toArray(schema),
      documentPatterns: toArray(documents),
      excludePatterns: toArray(exclude),
      getSchema() {
        return loadSchema(schema, {
          loaders: [jsonFileLoader, graphqlFileLoader],
          cwd: root,
        });
      },
    };
  };

  const projects: Record<string, GraphQLProjectConfiguration> = {};

  if (isSingleProjectConfig(config)) {
    projects.default = normalizeConfiguration('default', config);
  } else if (isMultipleProjectConfig(config)) {
    for (const [name, projectConfig] of Object.entries(config.projects)) {
      projects[name] = normalizeConfiguration(name, projectConfig);
    }
  }

  return {projects};
}

async function loadJavaScript(file: string): Promise<any> {
  const result = await import(file);
  return 'default' in result ? result.default : result;
}

async function loadTypeScript(file: string): Promise<any> {
  const {build} = await import('esbuild');

  const outputFile = file.replace('.ts', '.mjs');
  const buildResult = await build({
    entryPoints: [file],
    target: `node${process.version.slice(1)}`,
    format: 'esm',
    outfile: outputFile,
  });

  if (buildResult.errors.length > 0) {
    throw new Error(
      `Could not build GraphQL configuration file ${file}: ${
        buildResult.errors[0]!.detail
      }`,
    );
  }

  try {
    const result = await loadJavaScript(outputFile);
    return result;
  } finally {
    unlinkSync(outputFile);
  }
}

function isMultipleProjectConfig(config: unknown): config is GraphQLProjectMap {
  return (
    config != null && typeof (config as GraphQLProjectMap).projects === 'object'
  );
}

function isSingleProjectConfig(config: unknown): config is GraphQLProject {
  return (
    config != null && typeof (config as GraphQLProject).schema !== 'undefined'
  );
}

function toArray<T>(value?: T | T[]): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

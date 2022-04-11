import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import {MAGIC_MODULE_ENV} from '../../constants';
import type {Project, Workspace} from '../../kit';

export interface Options {
  mode: 'production' | 'development';
  project: Project;
  workspace: Workspace;
  inline: () => Promise<string[]>;
  runtime: () => Promise<string | undefined>;
  customize(content: string): Promise<string>;
}

export function magicModuleEnv({customize, ...options}: Options): Plugin {
  return {
    name: '@quilted/magic-module-env',
    resolveId(id) {
      if (id === MAGIC_MODULE_ENV) return id;
      return null;
    },
    async load(id) {
      if (id !== MAGIC_MODULE_ENV) return null;

      const content = await customize(await createEnvModuleContent(options));

      return content;
    },
  };
}

async function createEnvModuleContent({
  mode,
  project,
  workspace,
  inline: getInline,
  runtime: getRuntime,
}: Pick<Options, 'mode' | 'project' | 'workspace' | 'inline' | 'runtime'>) {
  const inlineEnv: Record<string, string> = {};

  const [env, inline, runtime] = await Promise.all([
    loadEnv(project, workspace, {mode}),
    getInline(),
    getRuntime(),
  ]);

  for (const inlineVariable of inline.sort()) {
    const value = env[inlineVariable];
    if (value == null) continue;
    inlineEnv[inlineVariable] = value;
  }

  return stripIndent`
    const runtime = (${runtime ?? '{}'});
    const inline = ${JSON.stringify(inlineEnv)};

    const Env = new Proxy(
      {},
      {
        get(_, property) {
          const value = inline[property] ?? runtime[property];
          
          return typeof value === 'string' && value[0] === '"' && value[value.length - 1] === '"'
            ? JSON.parse(value)
            : value;
        },
      },
    );

    export default Env;
  `;
}

// Inspired by https://github.com/vitejs/vite/blob/e0a4d810598d1834933ed437ac5a2168cbbbf2f8/packages/vite/source/node/config.ts#L1050-L1113
export async function loadEnv(
  project: Project,
  workspace: Workspace,
  {mode}: {mode: 'production' | 'development'},
): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = {...process.env};

  const envFiles = [
    // default file
    `.env`,
    // local file
    `.env.local`,
    // mode file
    `.env.${mode}`,
    // mode local file
    `.env.${mode}.local`,
  ];

  const {parse} = await import('dotenv');

  const loadEnvFile = async (file: string) => {
    if (await workspace.fs.hasFile(file)) {
      return parse(await workspace.fs.read(file));
    }
  };

  const envFileResults = await Promise.all([
    ...envFiles.map((file) => loadEnvFile(workspace.fs.resolvePath(file))),
    ...envFiles.map((file) => loadEnvFile(project.fs.resolvePath(file))),
  ]);

  for (const envFileResult of envFileResults) {
    if (envFileResult == null) continue;
    Object.assign(env, envFileResult);
  }

  return env;
}

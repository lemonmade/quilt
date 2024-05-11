import * as path from 'path';
import * as fs from 'fs';

import type {PluginContext} from 'rollup';

import {MAGIC_MODULE_ENV} from '../constants.ts';
import {multiline} from '../shared/strings.ts';
import {smartReplace} from '../shared/rollup.ts';
import {createMagicModulePlugin} from '../shared/magic-module.ts';

const EMPTY_PROCESS_ENV_OBJECT = {
  'globalThis.process.env.': `({}).`,
  'global.process.env.': `({}).`,
  'process.env.': `({}).`,
};

export function replaceProcessEnv({
  mode,
  preserve = true,
}: {
  mode: string;
  preserve?: boolean;
}) {
  return smartReplace({
    // @see https://github.com/vitejs/vite/blob/2b1ffe86328f9d06ef9528ee117b61889893ddcc/packages/vite/src/node/plugins/define.ts#L112
    'globalThis.process.env.NODE_ENV': JSON.stringify(mode),
    'global.process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.NODE_ENV': JSON.stringify(mode),
    ...(preserve ? {} : EMPTY_PROCESS_ENV_OBJECT),
  });
}

export interface MagicModuleEnvOptions {
  /**
   * The root directory to search for `.env` files in.
   *
   * @default process.cwd()
   */
  root?: string;

  /**
   * The runtime mode for your target environment.
   */
  mode?: 'production' | 'development';

  /**
   * Environment variables from the build environment to inline into the magic
   * module. Be careful when using this option! Inlining environment variables
   * into your application always comes with the risk of exposing sensitive information
   * to your users. Only use this option for environment variables that are safe
   * for a human to see if they open their browser developer tools.
   */
  inline?: string[];

  /**
   * A string that will be inlined directly as code to reference a runtime variable
   * that contains environment variables.
   */
  runtime?: string;

  /**
   * Whether to load environment variables from a `.env` file. The option can
   * be one of the following types:
   *
   * - `false`, which disables loading environment variables from a `.env` file.
   * - An object containing a `roots` field, specifying the directories to search
   * for `.env` files in.
   * - An object containing a `files` field, specifying the directories to search
   * for `.env` files in.
   *
   * @default {roots: ['.', 'configuration', '<workspace-root>', '<workspace-root>/configuration']}
   */
  dotenv?:
    | false
    | {roots?: string[]; files?: never}
    | {roots?: never; files?: string[]};
}

export function resolveEnvOption(
  option?: MagicModuleEnvOptions['mode'] | MagicModuleEnvOptions,
) {
  return typeof option === 'string' ? {mode: option} : option ?? {};
}

export function magicModuleEnv({
  mode,
  dotenv = {},
  inline = [],
  runtime = '{}',
}: MagicModuleEnvOptions = {}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/env',
    module: [MAGIC_MODULE_ENV, '@quilted/quilt/env'],
    async source() {
      const inlineEnv: Record<string, string> = {};

      if (mode) {
        inlineEnv.MODE = mode;
      }

      const loadedEnv = await loadEnv.call(this, {mode, dotenv});

      for (const inlineVariable of inline.sort()) {
        if (inlineVariable in inlineEnv) continue;
        const value = process.env[inlineVariable] ?? loadedEnv[inlineVariable];
        if (value == null) continue;
        inlineEnv[inlineVariable] =
          typeof value === 'string' &&
          value[0] === '"' &&
          value[value.length - 1] === '"'
            ? JSON.parse(value)
            : value;
      }

      return multiline`
        const runtime = (${runtime});
        const inline = JSON.parse(${JSON.stringify(JSON.stringify(inlineEnv))});

        const Env = new Proxy(
          {},
          {
            get(_, property) {
              return runtime[property] ?? inline[property];
            },
          },
        );

        export default Env;
      `;
    },
  });
}

// Inspired by https://github.com/vitejs/vite/blob/e0a4d810598d1834933ed437ac5a2168cbbbf2f8/packages/vite/source/node/config.ts#L1050-L1113
async function loadEnv(
  this: PluginContext,
  {root, mode, dotenv}: Pick<MagicModuleEnvOptions, 'root' | 'mode' | 'dotenv'>,
): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = {...process.env};

  if (dotenv !== false) {
    const {parse} = await import('dotenv');

    let files = dotenv?.files;

    if (files == null) {
      const testFiles = [
        // default file
        `.env`,
        // local file
        `.env.local`,
      ];

      if (mode) {
        testFiles.push(
          // mode file
          `.env.${mode}`,
          // mode local file
          `.env.${mode}.local`,
        );
      }

      let roots = dotenv?.roots;

      if (roots == null) {
        roots = ['.', 'configuration'];

        const workspaceRoot = findWorkspaceRoot(root);
        if (workspaceRoot) {
          roots.push(workspaceRoot, path.join(workspaceRoot, 'configuration'));
        }
      }

      files = testFiles.flatMap((file) =>
        roots!.map((root) => path.resolve(root, file)),
      );
    }

    const envFileResults = await Promise.all(
      files.map(async (file) => {
        if (fs.existsSync(file)) {
          this.addWatchFile(file);
          return parse(await fs.promises.readFile(file, 'utf-8'));
        }
      }),
    );

    for (const envFileResult of envFileResults) {
      if (envFileResult == null) continue;
      Object.assign(env, envFileResult);
    }
  }

  return env;
}

function findWorkspaceRoot(start = process.cwd()) {
  let current = path.resolve(start);

  while (true) {
    if (
      fs.existsSync(path.join(current, 'pnpm-lock.yaml')) ||
      fs.existsSync(path.join(current, 'yarn.lock')) ||
      fs.existsSync(path.join(current, 'package-lock.json'))
    ) {
      return current;
    }

    const next = path.dirname(current);
    if (next === current) return undefined;

    current = next;
  }
}

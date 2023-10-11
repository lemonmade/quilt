import * as path from 'path';
import * as fs from 'fs';

import type {PluginContext} from 'rollup';
import {stripIndent} from 'common-tags';

import {resolveValueOrPromise, type ValueOrPromise} from './values.ts';

export interface EnvMagicModuleOptions {
  /**
   * Environment variables from the build environment to inline into the magic
   * module. Be careful when using this option! Inlining environment variables
   * into your application always comes with the risk of exposing sensitive information
   * to your users. Only use this option for environment variables that are safe
   * for a human to see if they open their browser developer tools.
   */
  inline?: ValueOrPromise<string[] | undefined>;

  /**
   * A string that will be inlined directly as code to reference a runtime variable
   * that contains environment variables.
   */
  runtime?: ValueOrPromise<string | undefined>;

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
   * @default {roots: ['.', 'configuration']}
   */
  dotenv?:
    | false
    | {roots?: string[]; files?: never}
    | {roots?: never; files?: string[]};

  /**
   * Allows you to perform any final alterations on the content used
   * as the magic environment entry.
   */
  customize?(content: string): string | Promise<string>;
}

export async function createEnvMagicModule(
  this: PluginContext,
  {
    mode,
    dotenv = {roots: ['.', 'configuration']},
    inline: getInline,
    runtime: getRuntime,
    customize,
  }: {mode: string} & EnvMagicModuleOptions,
) {
  const inlineEnv: Record<string, string> = {
    MODE: mode,
  };

  const [loadedEnv, inline = [], runtime = '{}'] = await Promise.all([
    loadEnv.call(this, {mode, dotenv}),
    resolveValueOrPromise(getInline),
    resolveValueOrPromise(getRuntime),
  ]);

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

  const initialContent = stripIndent`
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

  const content = (await customize?.(initialContent)) ?? initialContent;
  return content;
}

// Inspired by https://github.com/vitejs/vite/blob/e0a4d810598d1834933ed437ac5a2168cbbbf2f8/packages/vite/source/node/config.ts#L1050-L1113
async function loadEnv(
  this: PluginContext,
  {
    mode,
    dotenv,
  }: {mode: string} & Required<Pick<EnvMagicModuleOptions, 'dotenv'>>,
): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = {...process.env};

  if (dotenv !== false) {
    const {parse} = await import('dotenv');

    const files =
      dotenv.files ??
      [
        // default file
        `.env`,
        // local file
        `.env.local`,
        // mode file
        `.env.${mode}`,
        // mode local file
        `.env.${mode}.local`,
      ].flatMap((file) =>
        (dotenv.roots ?? ['.', 'configuration']).map((root) =>
          path.resolve(root, file),
        ),
      );

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

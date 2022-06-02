import * as fs from 'fs';

import type {Result as ArgvResult} from 'arg';
import prompts from 'prompts';
import type {PromptObject} from 'prompts';
import * as color from 'colorette';

import {AbortError} from '@quilted/events';

export async function prompt(prompt: Omit<PromptObject, 'name'>) {
  const result = await prompts<'value'>(
    {name: 'value', ...prompt},
    {
      onCancel() {
        throw new AbortError();
      },
    },
  );

  return result.value;
}

type BaseArguments = ArgvResult<{
  '--yes': BooleanConstructor;
  '--install': BooleanConstructor;
  '--no-install': BooleanConstructor;
  '--monorepo': BooleanConstructor;
  '--no-monorepo': BooleanConstructor;
  '--extras': [StringConstructor];
  '--no-extras': BooleanConstructor;
  '--package-manager': StringConstructor;
}>;

export async function getCreateAsMonorepo(argv: BaseArguments) {
  let createAsMonorepo: boolean;

  if (argv['--monorepo' || argv['--yes']]) {
    createAsMonorepo = true;
  } else if (argv['--no-monorepo']) {
    createAsMonorepo = false;
  } else {
    createAsMonorepo = await prompt({
      type: 'confirm',
      message:
        'Do you want to create this app as a monorepo, with room for more projects?',
      initial: true,
    });
  }

  return createAsMonorepo;
}

export async function getShouldInstall(argv: BaseArguments) {
  let shouldInstall: boolean;

  if (argv['--install'] || argv['--yes']) {
    shouldInstall = true;
  } else if (argv['--no-install']) {
    shouldInstall = false;
  } else {
    shouldInstall = await prompt({
      type: 'confirm',
      message:
        'Do you want to install dependencies for this app after creating it?',
      initial: true,
    });
  }

  return shouldInstall;
}

const VALID_PACKAGE_MANAGERS = new Set(['pnpm', 'npm', 'yarn']);

export async function getPackageManager(argv: BaseArguments) {
  let packageManager!: 'yarn' | 'npm' | 'pnpm';

  if (argv['--package-manager']) {
    const explicitPackageManager =
      argv['--package-manager'].toLocaleLowerCase();

    packageManager = VALID_PACKAGE_MANAGERS.has(explicitPackageManager)
      ? (explicitPackageManager as any)
      : 'npm';
  } else {
    const npmUserAgent = process.env['npm_config_user_agent'] ?? 'npm';

    if (npmUserAgent.includes('pnpm') || fs.existsSync('pnpm-lock.yaml')) {
      packageManager = 'pnpm';
    } else if (npmUserAgent.includes('yarn') || fs.existsSync('yarn.lock')) {
      packageManager = 'yarn';
    } else {
      packageManager = 'npm';
    }
  }

  return packageManager;
}

type Extra = 'github' | 'vscode';
const VALID_EXTRAS = new Set<Extra>(['github', 'vscode']);

export async function getExtrasToSetup(
  argv: BaseArguments,
  {inWorkspace}: {inWorkspace: boolean},
) {
  if (inWorkspace || argv['--no-extras']) return new Set<Extra>();

  if (argv['--extras']) {
    return new Set<Extra>(
      argv['--extras'].filter((extra) =>
        VALID_EXTRAS.has(extra as any),
      ) as Extra[],
    );
  }

  const setupExtras = await prompt({
    type: 'multiselect',
    message: 'Which additional tools would you like to configure?',
    instructions: color.dim(
      `\n  Use ${color.bold('space')} to select, ${color.bold(
        'a',
      )} to select all, ${color.bold('return')} to submit`,
    ),
    choices: [
      {title: 'VSCode', value: 'vscode'},
      {title: 'GitHub', value: 'github'},
    ],
  });

  const extrasToSetup = new Set<Extra>(setupExtras as any[]);

  return extrasToSetup;
}

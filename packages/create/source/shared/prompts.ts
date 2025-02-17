import * as fs from 'fs';

import type {Result as ArgvResult} from 'arg';
import * as color from 'colorette';
import {
  prompt,
  getPackageManager as baseGetPackageManager,
  createPackageManagerRunner,
} from '@quilted/cli-kit';

type BaseArguments = ArgvResult<{
  '--yes': BooleanConstructor;
  '--install': BooleanConstructor;
  '--no-install': BooleanConstructor;
  '--monorepo': BooleanConstructor;
  '--no-monorepo': BooleanConstructor;
  '--in-workspace': BooleanConstructor;
  '--not-in-workspace': BooleanConstructor;
  '--extras': [StringConstructor];
  '--no-extras': BooleanConstructor;
  '--package-manager': StringConstructor;
}>;

export {prompt};

export async function getInWorkspace(argv: BaseArguments) {
  if (argv['--in-workspace']) return true;
  if (argv['--not-in-workspace']) return false;

  return fs.existsSync('pnpm-workspace.yaml');
}

export async function getCreateAsMonorepo(
  argv: BaseArguments,
  {
    type,
    default: defaultCreateAsMonorepo = true,
  }: {type: 'app' | 'package' | 'module' | 'server'; default?: boolean},
) {
  let createAsMonorepo: boolean;

  if (argv['--monorepo'] || argv['--yes']) {
    createAsMonorepo = true;
  } else if (argv['--no-monorepo']) {
    createAsMonorepo = false;
  } else {
    createAsMonorepo = await prompt({
      type: 'confirm',
      message: `Do you want to create this ${type} as a monorepo, with room for more projects?`,
      initial: defaultCreateAsMonorepo,
    });
  }

  return createAsMonorepo;
}

export async function getShouldInstall(argv: BaseArguments) {
  return !argv['--no-install'];
}

export async function getPackageManager(
  argv: BaseArguments,
  options?: Parameters<typeof createPackageManagerRunner>[1],
) {
  const packageManager = await baseGetPackageManager(argv['--package-manager']);
  return createPackageManagerRunner(packageManager ?? 'pnpm', options);
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

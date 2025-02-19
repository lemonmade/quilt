import {relative} from 'path';

import {
  format,
  relativeDirectoryForDisplay,
  type OutputTarget,
} from '../shared.ts';

export async function addToPackageManagerWorkspaces(
  directory: string,
  output: OutputTarget,
  packageManager: 'yarn' | 'npm' | 'pnpm',
) {
  if (packageManager === 'pnpm') {
    const {parse, stringify} = await (import('yaml') as Promise<{
      parse: (content: string) => any;
      stringify: (value: any) => string;
    }>);

    const workspaceYaml = parse(await output.read('pnpm-workspace.yaml'));

    workspaceYaml.packages = await addToWorkspaces(
      relative(output.root, directory),
      workspaceYaml.packages ?? [],
    );

    await output.write(
      'pnpm-workspace.yaml',
      await format(stringify(workspaceYaml), {as: 'yaml'}),
    );
  } else {
    const packageJson = JSON.parse(await output.read('package.json'));

    packageJson.workspaces = await addToWorkspaces(
      relative(output.root, directory),
      packageJson.workspaces ?? [],
    );

    await output.write(
      'package.json',
      await format(JSON.stringify(packageJson), {
        as: 'json-stringify',
      }),
    );
  }
}

async function addToWorkspaces(relative: string, workspaces: string[]) {
  if (workspaces.length === 0) {
    return [relative];
  }

  // Default documentation seems to generally exclude leading `./` on paths
  let pretty = false;
  let hasMatch = false;

  const {default: minimatch} = await import('minimatch');

  for (const pattern of workspaces) {
    let normalizedPattern = pattern;

    if (pattern.startsWith('./')) {
      pretty = true;
      normalizedPattern = pattern.slice(2);
    }

    if (minimatch(relative, normalizedPattern)) {
      hasMatch = true;
      break;
    }
  }

  if (hasMatch) {
    return workspaces;
  }

  return [
    ...workspaces,
    pretty ? relativeDirectoryForDisplay(relative) : relative,
  ].sort((patternOne, patternTwo) => patternOne.localeCompare(patternTwo));
}

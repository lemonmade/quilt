import * as fs from 'fs';
import * as path from 'path';

import {stripIndent, color, prompt, parseArguments} from '@quilted/cli-kit';

import {printHelp} from './help';
import {
  format,
  loadTemplate,
  createOutputTarget,
  isEmpty,
  emptyDirectory,
  toValidPackageName,
  relativeDirectoryForDisplay,
  mergeWorkspaceAndProjectPackageJsons,
} from './shared';
import {
  getInWorkspace,
  getCreateAsMonorepo,
  getExtrasToSetup,
  getPackageManager,
  getShouldInstall,
} from './shared/prompts';
import {addToTsConfig} from './shared/tsconfig';
import {addToPackageManagerWorkspaces} from './shared/package-manager';

type Arguments = ReturnType<typeof getArguments>;

export async function createProject() {
  const args = getArguments();

  if (args['--help']) {
    const additionalOptions = stripIndent`
      ${color.cyan(`--description`)}, ${color.cyan(`--no-description`)}
      A short description of the package. If you don’t provide this option, the command will ask
      you for a description later.
      ${color.dim(
        `@see https://docs.npmjs.com/cli/v9/configuring-npm/package-json#description`,
      )}

      ${color.cyan(`--react`)}, ${color.cyan(`--no-react`)}
      Whether this package will use React. If you don’t provide this option, the command
      will ask you about it later.

      ${color.cyan(`--public`)}, ${color.cyan(`--private`)}
      Whether this package will be published for other projects to install. If you do not
      provide this option, the command will ask you about it later.

      ${color.cyan(`--repository`)}, ${color.cyan(`--no-repository`)}
      The URL of a git repository where your code lives. If you do not provide this option,
      this command will try to guess the correct repository to use based on existing packages.
      ${color.dim(
        `@see https://docs.npmjs.com/cli/v9/configuring-npm/package-json#repository`,
      )}

      ${color.cyan(`--registry`)}
      The package registry to publish this package to. This option only applies if you create
      a public package. If you do not provide this option, it will use the default NPM registry.
    `;

    printHelp({
      kind: 'package',
      options: additionalOptions,
      packageManager: args['--package-manager']?.toLowerCase(),
    });
    return;
  }

  const name = await getName(args);
  const description = await getDescription(args);
  const inWorkspace = await getInWorkspace(args);
  const directory = await getDirectory(args, {name, inWorkspace});
  const isPublic = await getPublic(args);
  const repository = await getRepository(args, {inWorkspace});
  const useReact = await getReact(args);

  const createAsMonorepo =
    !inWorkspace && (await getCreateAsMonorepo(args, {type: 'package'}));
  const setupExtras = await getExtrasToSetup(args, {inWorkspace});
  const shouldInstall = await getShouldInstall(args, {type: 'package'});
  const packageManager = await getPackageManager(args, {root: directory});

  const partOfMonorepo = inWorkspace || createAsMonorepo;

  const packageDirectory = createAsMonorepo
    ? path.join(
        directory,
        `packages/${toValidPackageName(name.split('/').pop()!)}`,
      )
    : directory;

  if (fs.existsSync(directory)) {
    await emptyDirectory(directory);

    if (packageDirectory !== directory) {
      fs.mkdirSync(packageDirectory, {recursive: true});
    }
  } else {
    fs.mkdirSync(packageDirectory, {recursive: true});
  }

  const rootDirectory = inWorkspace ? process.cwd() : directory;
  const outputRoot = createOutputTarget(rootDirectory);
  const packageTemplate = loadTemplate('package');
  const workspaceTemplate = loadTemplate('workspace');

  let quiltProject = await packageTemplate.read('quilt.project.ts');

  if (!useReact) {
    quiltProject = quiltProject.replace(
      'quiltPackage()',
      'quiltPackage({react: false})',
    );
  }

  // If we aren’t already in a workspace, copy the workspace files over, which
  // are needed if we are making a monorepo or not.
  if (!inWorkspace) {
    await workspaceTemplate.copy(directory, (file) => {
      // When this is a single project, we use the project’s Quilt configuration as the base.
      if (file === 'quilt.workspace.ts') return createAsMonorepo;

      // We need to make some adjustments to the root package.json
      return file !== 'package.json';
    });

    // If we are creating a monorepo, we need to add the root package.json and
    // package manager workspace configuration.
    if (createAsMonorepo) {
      const packageRelativeToRoot = path.relative(
        rootDirectory,
        packageDirectory,
      );
      const packageGlobRelativeToRoot = relativeDirectoryForDisplay(
        path.join(packageRelativeToRoot, '*'),
      );
      const workspacePackageJson = JSON.parse(
        await workspaceTemplate.read('package.json'),
      );

      workspacePackageJson.name = toValidPackageName(name!);
      workspacePackageJson.workspaces = [packageGlobRelativeToRoot];

      if (packageManager.type === 'pnpm') {
        await outputRoot.write(
          'pnpm-workspace.yaml',
          await format(
            `
              packages:
              - '${packageGlobRelativeToRoot}'
            `,
            {as: 'yaml'},
          ),
        );
      }

      await outputRoot.write(
        'package.json',
        await format(JSON.stringify(workspacePackageJson), {
          as: 'json-stringify',
        }),
      );
    } else {
      const [projectPackageJson, projectTSConfig, workspacePackageJson] =
        await Promise.all([
          packageTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
          packageTemplate
            .read('tsconfig.json')
            .then((content) => JSON.parse(content)),
          workspaceTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
        ]);

      const mergedPackageJson = mergeWorkspaceAndProjectPackageJsons(
        projectPackageJson,
        workspacePackageJson,
      );

      delete mergedPackageJson.workspaces;

      adjustPackageJson(mergedPackageJson, {
        name: toValidPackageName(name!),
        description,
        react: useReact,
        isPublic,
        registry: args['--registry'],
      });

      quiltProject = quiltProject
        .replace('quiltPackage', 'quiltWorkspace, quiltPackage')
        .replace('quiltPackage(', 'quiltWorkspace(), quiltPackage(');

      await outputRoot.write(
        'quilt.project.ts',
        await format(quiltProject, {as: 'typescript'}),
      );

      await outputRoot.write(
        'package.json',
        await format(JSON.stringify(mergedPackageJson), {
          as: 'json-stringify',
        }),
      );

      await outputRoot.write(
        'tsconfig.json',
        await format(JSON.stringify(projectTSConfig), {as: 'json'}),
      );
    }

    if (setupExtras.has('github')) {
      await loadTemplate('github').copy(directory);
    }

    if (setupExtras.has('vscode')) {
      await loadTemplate('vscode').copy(directory);
    }
  }

  await packageTemplate.copy(packageDirectory, (file) => {
    // If we are in a monorepo, we can use all the template files as they are
    if (file === 'tsconfig.json') {
      return partOfMonorepo;
    }

    // We need to make some adjustments the project’s package.json, README, and Quilt config
    return (
      file !== 'package.json' &&
      file !== 'quilt.project.ts' &&
      file !== 'README.md'
    );
  });

  await outputRoot.write(
    path.join(packageDirectory, 'README.md'),
    (
      await packageTemplate.read('README.md')
    ).replaceAll('{{name}}', toValidPackageName(name!)),
  );

  if (partOfMonorepo) {
    // Write the package’s package.json (the root one was already created)
    const projectPackageJson = JSON.parse(
      await packageTemplate.read('package.json'),
    );

    if (repository === false) {
      delete projectPackageJson.repository;
    } else {
      const directory = path.relative(rootDirectory, packageDirectory);

      if (typeof repository === 'string') {
        projectPackageJson.repository = {
          type: 'git',
          url: repository,
          directory,
        };
      } else if (repository != null) {
        projectPackageJson.repository = {type: 'git', ...repository, directory};
      } else {
        projectPackageJson.repository.directory = directory;
      }
    }

    adjustPackageJson(projectPackageJson, {
      name: toValidPackageName(name),
      description,
      react: useReact,
      isPublic,
      registry: args['--registry'],
    });

    await outputRoot.write(
      path.join(packageDirectory, 'package.json'),
      await format(JSON.stringify(projectPackageJson), {
        as: 'json-stringify',
      }),
    );

    await outputRoot.write(
      path.join(packageDirectory, 'quilt.project.ts'),
      quiltProject,
    );

    await Promise.all([
      addToTsConfig(packageDirectory, outputRoot),
      addToPackageManagerWorkspaces(
        packageDirectory,
        outputRoot,
        packageManager.type,
      ),
    ]);
  }

  if (shouldInstall) {
    console.log();
    // TODO: better loading, handle errors
    await packageManager.install();
  }

  console.log();
  console.log(
    stripIndent`
      Your new package, ${color.bold(
        name,
      )}, is ready to go! You can edit the code
      for your package in ${color.cyan(
        relativeDirectoryForDisplay(
          path.relative(process.cwd(), path.join(packageDirectory, 'source')),
        ),
      )}.
    `,
  );

  if (isPublic) {
    const needsPackageJsonKeys: {field: string; url: string}[] = [];

    if (!description) {
      needsPackageJsonKeys.push({
        field: 'description',
        url: 'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#description',
      });
    }

    if (repository == null) {
      needsPackageJsonKeys.push({
        field: 'repository.url',
        url: 'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#repository',
      });
    }

    console.log();

    const logPackageJsonField = (field: string, url: string) => {
      console.log(
        `  - ${color.bold(JSON.stringify(field))} ${color.dim(
          `(${color.underline(url)})`,
        )}`,
      );
    };

    if (needsPackageJsonKeys.length > 0) {
      console.log(
        stripIndent`
          Before you publish your package, you will need to add the following key${
            needsPackageJsonKeys.length > 1 ? 's' : ''
          }
          to ${color.cyan(
            relativeDirectoryForDisplay(
              path.relative(
                process.cwd(),
                path.join(packageDirectory, 'package.json'),
              ),
            ),
          )}:
        `,
      );

      console.log();

      for (const {field, url} of needsPackageJsonKeys) {
        logPackageJsonField(field, url);
      }

      console.log();

      console.log(
        'In that same file, make sure the contents of these fields are right for your package:',
      );

      console.log();
    } else {
      console.log(
        stripIndent`
          Before you publish your package, make the following fields look right
          in ${color.cyan(
            relativeDirectoryForDisplay(
              path.relative(
                process.cwd(),
                path.join(packageDirectory, 'package.json'),
              ),
            ),
          )}:
        `,
      );

      console.log();
    }

    logPackageJsonField(
      'version',
      'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#version',
    );
    logPackageJsonField(
      'license',
      'https://docs.npmjs.com/cli/v9/configuring-npm/package-json#license',
    );
    logPackageJsonField(
      'exports',
      'https://nodejs.org/api/packages.html#package-entry-points',
    );
  }

  const followUp = stripIndent`
    Quilt can help you build, test, lint, and type-check your new package. You
    can learn more about building packages with Quilt by reading the documentation:
    ${color.underline(
      color.magenta(
        'https://github.com/lemonmade/quilt/tree/main/documentation',
      ),
    )}

    Have fun! 🎉
  `;

  console.log();
  console.log(followUp);
}

// Argument handling

function getArguments() {
  const args = parseArguments(
    {
      '--yes': Boolean,
      '-y': '--yes',
      '--name': String,
      '--directory': String,
      '--description': String,
      '--no-description': Boolean,
      '--repository': String,
      '--no-repository': Boolean,
      '--install': Boolean,
      '--no-install': Boolean,
      '--monorepo': Boolean,
      '--no-monorepo': Boolean,
      '--package-manager': String,
      '--extras': [String],
      '--no-extras': Boolean,
      '--react': Boolean,
      '--no-react': Boolean,
      '--public': Boolean,
      '--private': Boolean,
      '--registry': String,
      '--help': Boolean,
      '-h': '--help',
    },
    {permissive: true},
  );

  return args;
}

async function getName(args: Arguments) {
  let {'--name': name} = args;

  if (name == null) {
    name = await prompt({
      type: 'text',
      message: 'What would you like to name your new package?',
      initial: '@my-team/package',
    });
  }

  return name!;
}

async function getDirectory(
  args: Arguments,
  {name, inWorkspace}: {name: string; inWorkspace: boolean},
) {
  let directory = args['--directory']
    ? path.resolve(args['--directory'])
    : undefined;

  if (directory == null) {
    const basePackageName = toValidPackageName(name.split('/').pop()!);
    const defaultDirectory = inWorkspace
      ? `packages/${basePackageName}`
      : basePackageName;

    directory = path.resolve(
      await prompt({
        type: 'text',
        message: 'Where would you like to create your new package?',
        initial: defaultDirectory,
      }),
    );
  }

  while (!args['--yes']) {
    if (fs.existsSync(directory) && !(await isEmpty(directory))) {
      const relativeDirectory = path.relative(process.cwd(), directory);

      const empty = await prompt({
        type: 'confirm',
        message: `Directory ${color.bold(
          relativeDirectoryForDisplay(relativeDirectory),
        )} is not empty, is it safe to empty it?`,
        initial: true,
      });

      if (empty) break;

      const promptDirectory = await prompt({
        type: 'text',
        message: 'What directory do you want to create your package in?',
      });

      directory = path.resolve(promptDirectory);
    } else {
      break;
    }
  }

  return directory;
}

async function getDescription(args: Arguments) {
  if (args['--description']) return args['--description'];
  if (args['--no-description']) return false;

  const description = await prompt({
    type: 'text',
    message: 'What is a short description of what this package will do?',
  });

  return description;
}

async function getRepository(args: Arguments, {inWorkspace = false} = {}) {
  if (args['--repository']) return args['--repository'];
  if (args['--no-repository']) return false;

  if (!inWorkspace) return;

  const {globby} = await import('globby');

  const files = await globby('**/package.json', {ignore: ['**/node_modules']});

  for (const file of files) {
    try {
      const json = JSON.parse(await fs.promises.readFile(file, 'utf8'));
      if (json.repository) return json.repository as string | {url: string};
    } catch {
      // noop
    }
  }
}

async function getPublic(args: Arguments) {
  let isPublic: boolean;

  if (args['--public'] || args['--yes']) {
    isPublic = true;
  } else if (args['--private']) {
    isPublic = false;
  } else {
    isPublic = await prompt({
      type: 'confirm',
      message: 'Will you publish this package to use in other projects?',
      initial: true,
    });
  }

  return isPublic;
}

async function getReact(args: Arguments) {
  let useReact: boolean;

  if (args['--react'] || args['--yes']) {
    useReact = true;
  } else if (args['--no-react']) {
    useReact = false;
  } else {
    useReact = await prompt({
      type: 'confirm',
      message: 'Will this package depend on React?',
      initial: true,
    });
  }

  return useReact;
}

function adjustPackageJson(
  packageJson: Record<string, any>,
  {
    name,
    description,
    react,
    isPublic,
    registry,
  }: {
    name: string;
    description: string | false;
    react: boolean;
    isPublic: boolean;
    registry?: string;
  },
) {
  packageJson.name = name;

  const packageParts = name.split('/');
  const scope = packageParts[0]!.startsWith('@') ? packageParts[0] : undefined;
  const finalRegistry = registry ?? 'https://registry.npmjs.org';

  if (description) {
    packageJson.description = description;
  } else {
    delete packageJson.description;
  }

  if (scope) {
    packageJson.publishConfig[`${scope}/registry`] = finalRegistry;
  } else if (registry) {
    packageJson.publishConfig.registry = finalRegistry;
  }

  if (isPublic) {
    delete packageJson.private;
  } else {
    delete packageJson.license;
    delete packageJson.repository;
    delete packageJson.publishConfig;

    // in private packages, we just need to reference the source.
    const newExports: Record<string, string> = {};

    for (const [key, value] of Object.entries(packageJson.exports)) {
      if (typeof value === 'string') {
        newExports[key] = value;
      }

      const sourceEntry = (value as any)?.['quilt:source'];

      if (typeof sourceEntry === 'string') {
        newExports[key] = sourceEntry;
      }
    }

    packageJson.exports = newExports;
  }

  if (!react) {
    delete packageJson.dependencies['@types/react'];
    delete packageJson.devDependencies['react'];
    delete packageJson.peerDependencies['react'];
    delete packageJson.peerDependenciesMeta['react'];

    packageJson.eslintConfig.extends = packageJson.eslintConfig.extends.filter(
      (extend: string) => !extend.includes('react'),
    );
  }

  return packageJson;
}

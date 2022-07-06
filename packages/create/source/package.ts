import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';

import {printHelp} from './help';
import {
  format,
  loadTemplate,
  createOutputTarget,
  isEmpty,
  emptyDirectory,
  toValidPackageName,
  relativeDirectoryForDisplay,
} from './shared';
import {
  prompt,
  getCreateAsMonorepo,
  getExtrasToSetup,
  getPackageManager,
  getShouldInstall,
} from './shared/prompts';
import {addToTsConfig} from './shared/tsconfig';
import {addToPackageManagerWorkspaces} from './shared/package-manager';

type Arguments = ReturnType<typeof getArgv>;

export async function createProject() {
  const argv = getArgv();

  if (argv['--help']) {
    const additionalOptions = stripIndent`
      ${color.cyan(`--react`)}, ${color.cyan(`--no-react`)}
      Whether this package will use React. If you don’t provide this option, the command
      will ask you about it later.

      ${color.cyan(`--public`)}, ${color.cyan(`--private`)}
      Whether this package will be published for other projects to install. If you do not
      provide this option, the command will ask you about it later.

      ${color.cyan(`--registry`)}
      The package registry to publish this package to. This option only applies if you create
      a public package. If you do not provide this option, it will use the default NPM registry.
    `;

    printHelp({
      kind: 'package',
      options: additionalOptions,
      packageManager: argv['--package-manager']?.toLowerCase(),
    });
    return;
  }

  const inWorkspace = fs.existsSync('quilt.workspace.ts');

  const name = await getName(argv);
  const directory = await getDirectory(argv, {name, inWorkspace});
  const isPublic = await getPublic(argv);
  const useReact = await getReact(argv);

  const createAsMonorepo = !inWorkspace && (await getCreateAsMonorepo(argv));
  const shouldInstall = await getShouldInstall(argv);
  const packageManager = await getPackageManager(argv);
  const setupExtras = await getExtrasToSetup(argv, {inWorkspace});

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

  if (useReact) {
    quiltProject = quiltProject.replace('react: false', 'react: true');
  }

  // If we aren’t already in a workspace, copy the workspace files over, which
  // are needed if we are making a monorepo or not.
  if (!inWorkspace) {
    await workspaceTemplate.copy(directory, (file) => {
      // When this is a single project, we use the project’s Quilt  configuration as the base.
      if (file === 'quilt.workspace.ts') return createAsMonorepo;

      // We need to make some adjustments to the root package.json
      return file !== 'package.json';
    });

    // If we are creating a monorepo, we need to add the root package.json and
    // package manager workspace configuration.
    if (createAsMonorepo) {
      const workspacePackageJson = JSON.parse(
        await workspaceTemplate.read('package.json'),
      );

      workspacePackageJson.name = toValidPackageName(name!);

      if (packageManager === 'pnpm') {
        await outputRoot.write(
          'pnpm-workspace.yaml',
          await format(
            `
              packages:
              - './packages/*'
            `,
            {as: 'yaml'},
          ),
        );
      } else {
        workspacePackageJson.workspaces = ['packages/*'];
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

      workspacePackageJson.eslintConfig = projectPackageJson.eslintConfig;
      workspacePackageJson.browserslist = projectPackageJson.browserslist;

      const newPackageJson: Record<string, any> = {};

      // We want to put the project’s dependencies in the package.json, respecting
      // the preferred ordering (dependencies, peer dependencies, dev dependencies).
      for (const [key, value] of Object.entries(projectPackageJson)) {
        if (key !== 'devDependencies') {
          newPackageJson[key] = value;
          continue;
        }

        newPackageJson.dependencies = projectPackageJson.dependencies;
        newPackageJson.peerDependencies = projectPackageJson.peerDependencies;
        newPackageJson.peerDependenciesMeta =
          projectPackageJson.peerDependenciesMeta;
        newPackageJson.devDependencies = sortKeys({
          ...workspacePackageJson.devDependencies,
          ...projectPackageJson.devDependencies,
        });
      }

      adjustPackageJson(newPackageJson, {
        name: toValidPackageName(name!),
        react: useReact,
        isPublic,
        registry: argv['--registry'],
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
        await format(JSON.stringify(newPackageJson), {
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

    // We need to make some adjustments the project’s package.json and Quilt config
    return file !== 'package.json' && file !== 'quilt.project.ts';
  });

  if (partOfMonorepo) {
    // Write the package’s package.json (the root one was already created)
    const projectPackageJson = JSON.parse(
      await packageTemplate.read('package.json'),
    );

    projectPackageJson.repository.directory = path.relative(
      directory,
      packageDirectory,
    );

    adjustPackageJson(projectPackageJson, {
      name: toValidPackageName(name),
      react: useReact,
      isPublic,
      registry: argv['--registry'],
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
        packageManager,
      ),
    ]);
  }

  if (shouldInstall) {
    process.stdout.write('\nInstalling dependencies...\n');
    // TODO: better loading, handle errors
    execSync(`${packageManager} install`, {cwd: rootDirectory});
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
    console.log('Installed dependencies.');
  }

  const packageJsonInstructions = stripIndent`
    Your new package is ready to go! However, before you go too much further,
    you should update the following fields in ${color.cyan(
      relativeDirectoryForDisplay(
        path.relative(
          process.cwd(),
          path.join(packageDirectory, 'package.json'),
        ),
      ),
    )}:

     - ${color.bold(
       `"description"`,
     )}, where you provide a description of what your package does
     - ${color.bold(`"repository"`)}, where you should include the ${color.bold(
    `"url"`,
  )} of your project’s repo

    Before you publish your package, you will also want to update the ${color.bold(
      `"version"`,
    )}
    field in the package.json file.
  `;

  console.log();
  console.log(packageJsonInstructions);

  const commands: string[] = [];

  if (!inWorkspace && directory !== process.cwd()) {
    commands.push(
      `cd ${color.cyan(
        relativeDirectoryForDisplay(path.relative(process.cwd(), directory)),
      )} ${color.dim('# Move into your new package’s directory')}`,
    );
  }

  if (!shouldInstall) {
    commands.push(
      `pnpm install ${color.dim('# Install all your dependencies')}`,
    );
  }

  if (!inWorkspace) {
    // TODO: change this condition to check if git was initialized already
    commands.push(
      `git init && git add -A && git commit -m "Initial commit" ${color.dim(
        '# Start your git history (optional)',
      )}`,
    );
  }

  if (commands.length > 0) {
    const whatsNext = stripIndent`
      After you update your package.json, there’s ${
        commands.length > 1 ? 'a few more steps' : 'one more step'
      } you’ll need to take
      in order to start building:
    `;

    console.log();
    console.log(whatsNext);
    console.log();
    console.log(commands.map((command) => `  ${command}`).join('\n'));
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

function getArgv() {
  const argv = arg(
    {
      '--yes': Boolean,
      '-y': '--yes',
      '--name': String,
      '--directory': String,
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

  return argv;
}

async function getName(argv: Arguments) {
  let {'--name': name} = argv;

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
  argv: Arguments,
  {name, inWorkspace}: {name: string; inWorkspace: boolean},
) {
  let directory = argv['--directory']
    ? path.resolve(argv['--directory'])
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

  while (!argv['--yes']) {
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

async function getPublic(argv: Arguments) {
  let isPublic: boolean;

  if (argv['--public'] || argv['--yes']) {
    isPublic = true;
  } else if (argv['--private']) {
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

async function getReact(argv: Arguments) {
  let useReact: boolean;

  if (argv['--react'] || argv['--yes']) {
    useReact = true;
  } else if (argv['--no-react']) {
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
    react,
    isPublic,
    registry,
  }: {name: string; react: boolean; isPublic: boolean; registry?: string},
) {
  packageJson.name = name;

  const packageParts = name.split('/');
  const scope = packageParts[0]!.startsWith('@') ? packageParts[0] : undefined;
  const finalRegistry = registry ?? 'https://registry.npmjs.org';

  if (scope) {
    packageJson.publishConfig[`${scope}/registry`] = finalRegistry;
  } else if (registry) {
    packageJson.publishConfig.registry = finalRegistry;
  }

  if (isPublic) {
    delete packageJson.private;
  } else {
    delete packageJson.publishConfig;
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

function sortKeys(object: Record<string, any>) {
  const newObject: Record<string, any> = {};
  const sortedEntries = Object.entries(object).sort(([keyOne], [keyTwo]) =>
    keyOne.localeCompare(keyTwo),
  );

  for (const [key, value] of sortedEntries) {
    newObject[key] = value;
  }

  return newObject;
}

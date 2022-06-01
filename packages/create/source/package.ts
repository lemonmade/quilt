import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';

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

type Arguments = ReturnType<typeof getArgv>;

export async function createPackage() {
  const argv = getArgv();
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

      workspacePackageJson.name = toValidPackageName(name!);
      workspacePackageJson.eslintConfig = projectPackageJson.eslintConfig;
      workspacePackageJson.browserslist = projectPackageJson.browserslist;

      if (isPublic) {
        delete workspacePackageJson.private;
      }

      if (!useReact) {
        delete workspacePackageJson.dependencies['react'];
        delete workspacePackageJson.dependencies['react-dom'];
        delete workspacePackageJson.devDependencies['@types/react'];
      }

      const addBackToTSConfigInclude = new Set([
        'quilt.project.ts',
        '*.test.ts',
        '*.test.tsx',
      ]);

      projectTSConfig.exclude = projectTSConfig.exclude.filter(
        (excluded: string) => !addBackToTSConfigInclude.has(excluded),
      );

      quiltProject = quiltProject
        .replace('quiltPackage', 'quiltWorkspace, quiltPackage')
        .replace('quiltPackage(', 'quiltWorkspace(), quiltPackage(');

      await outputRoot.write(
        'quilt.project.ts',
        await format(quiltProject, {as: 'typescript'}),
      );

      await outputRoot.write(
        'package.json',
        await format(JSON.stringify(workspacePackageJson), {
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

    projectPackageJson.name = toValidPackageName(name);

    if (isPublic) {
      delete projectPackageJson.private;
    }

    await outputRoot.write(
      path.join(packageDirectory, 'package.json'),
      await format(JSON.stringify(projectPackageJson), {
        as: 'json-stringify',
      }),
    );

    // Update the TSConfig to include the new package
    const tsconfig = JSON.parse(await outputRoot.read('tsconfig.json'));

    tsconfig.references ??= [];
    tsconfig.references.push({
      path: relativeDirectoryForDisplay(
        path.relative(rootDirectory, packageDirectory),
      ),
    });

    await outputRoot.write(
      'tsconfig.json',
      await format(JSON.stringify(tsconfig), {as: 'json'}),
    );

    // Update the workspaces configuration to include the new app
    if (packageManager === 'pnpm') {
      const {parse, stringify} = await import('yaml');
      const workspaceYaml = parse(await outputRoot.read('pnpm-workspace.yaml'));

      workspaceYaml.packages ??= [];
      workspaceYaml.packages.push(
        relativeDirectoryForDisplay(
          path.relative(rootDirectory, packageDirectory),
        ),
      );

      await outputRoot.write(
        'pnpm-workspace.yaml',
        await format(stringify(workspaceYaml), {as: 'yaml'}),
      );
    } else {
      const packageJson = JSON.parse(await outputRoot.read('package.json'));

      packageJson.workspaces ??= [];
      packageJson.workspaces.push(
        relativeDirectoryForDisplay(
          path.relative(rootDirectory, packageDirectory),
        ),
      );

      await outputRoot.write(
        'package.json',
        await format(JSON.stringify(packageJson), {
          as: 'json-stringify',
        }),
      );
    }
  }

  if (shouldInstall) {
    process.stdout.write('\nInstalling dependencies...\n');
    // TODO: better loading, handle errors
    execSync(`${packageManager} install`, {cwd: rootDirectory});
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
    console.log('Installed dependencies.');
  }

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

  const whatsNext = stripIndent`
    Your new package is ready to go! There’s just ${
      commands.length > 1 ? 'a few more steps' : 'one more step'
    } you’ll need to take
    in order to start building:
  `;

  console.log();
  console.log(whatsNext);
  console.log();
  console.log(commands.map((command) => `  ${command}`).join('\n'));

  const followUp = stripIndent`
    Quilt can also help you build, test, lint, and type-check your new package.
    You can learn more about building packages with Quilt by reading the documentation:
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
      message: 'Will this package be released publicly?',
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

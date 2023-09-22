import * as fs from 'fs';
import * as path from 'path';

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';

import {printHelp} from './help.ts';
import {
  format,
  loadTemplate,
  createOutputTarget,
  isEmpty,
  emptyDirectory,
  toValidPackageName,
  relativeDirectoryForDisplay,
  mergeWorkspaceAndProjectPackageJsons,
} from './shared.ts';
import {
  prompt,
  getInWorkspace,
  getCreateAsMonorepo,
  getExtrasToSetup,
  getPackageManager,
  getShouldInstall,
} from './shared/prompts.ts';
import {addToTsConfig} from './shared/tsconfig.ts';
import {addToPackageManagerWorkspaces} from './shared/package-manager.ts';

type Arguments = ReturnType<typeof getArgv>;

export async function createService() {
  const argv = getArgv();

  if (argv['--help']) {
    printHelp({
      kind: 'service',
      packageManager: argv['--package-manager']?.toLowerCase(),
    });
    return;
  }

  const inWorkspace = await getInWorkspace(argv);
  const name = await getName(argv);
  const directory = await getDirectory(argv, {name});
  const entry = await getEntry(argv, {name});

  const createAsMonorepo =
    !inWorkspace &&
    (await getCreateAsMonorepo(argv, {
      type: 'service',
      default: false,
    }));
  const setupExtras = await getExtrasToSetup(argv, {inWorkspace});
  const shouldInstall = await getShouldInstall(argv);
  const packageManager = await getPackageManager(argv, {root: directory});

  const partOfMonorepo = inWorkspace || createAsMonorepo;

  const serviceDirectory = createAsMonorepo
    ? path.join(directory, toValidPackageName(name))
    : directory;

  if (fs.existsSync(directory)) {
    await emptyDirectory(directory);

    if (serviceDirectory !== directory) {
      fs.mkdirSync(serviceDirectory, {recursive: true});
    }
  } else {
    fs.mkdirSync(serviceDirectory, {recursive: true});
  }

  const rootDirectory = inWorkspace ? process.cwd() : directory;
  const outputRoot = createOutputTarget(rootDirectory);
  const serviceTemplate = loadTemplate('service-basic');
  const workspaceTemplate = loadTemplate('workspace');

  // If we aren’t already in a workspace, copy the workspace files over, which
  // are needed if we are making a monorepo or not.
  if (!inWorkspace) {
    await workspaceTemplate.copy(directory, (file) => {
      // When this is a single project, we use the project’s Quilt  configuration as the base.
      if (file === 'quilt.workspace.ts') return createAsMonorepo;

      // We need to make some adjustments to the root package.json
      if (file === 'package.json') return false;

      return true;
    });

    // If we are creating a monorepo, we need to add the root package.json and
    // package manager workspace configuration.
    if (createAsMonorepo) {
      const serviceRelativeToRoot = relativeDirectoryForDisplay(
        path.relative(directory, serviceDirectory),
      );

      const workspacePackageJson = JSON.parse(
        await workspaceTemplate.read('package.json'),
      );

      workspacePackageJson.name = toValidPackageName(name!);
      workspacePackageJson.workspaces = [serviceRelativeToRoot, './packages/*'];

      if (packageManager.type === 'pnpm') {
        await outputRoot.write(
          'pnpm-workspace.yaml',
          await format(
            `
              packages:
              - '${serviceRelativeToRoot}'
              - './packages/*'
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
          serviceTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
          serviceTemplate
            .read('tsconfig.json')
            .then((content) => JSON.parse(content)),
          workspaceTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
        ]);

      const combinedPackageJson = mergeWorkspaceAndProjectPackageJsons(
        projectPackageJson,
        workspacePackageJson,
      );

      adjustPackageJson(combinedPackageJson, {name, entry});
      delete combinedPackageJson.workspaces;

      await outputRoot.write(
        'package.json',
        await format(JSON.stringify(combinedPackageJson), {
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

  await serviceTemplate.copy(serviceDirectory, (file) => {
    // If we are in a monorepo, we can use all the template files as they are
    if (file === 'tsconfig.json') {
      return partOfMonorepo;
    }

    // We will adjust the entry file, and write an adjusted quilt project file if necessary
    if (file === 'service.ts' || file === 'quilt.project.ts') {
      return false;
    }

    // We need to make some adjustments the project’s package.json
    return file !== 'package.json';
  });

  let quiltProject = await serviceTemplate.read('quilt.project.ts');

  if (!partOfMonorepo) {
    quiltProject = quiltProject
      .replace('quiltService', 'quiltWorkspace, quiltService')
      .replace('quiltService(', 'quiltWorkspace(), quiltService(');
  }

  quiltProject = quiltProject.replace(
    'service.ts',
    entry.replace(/^\.[/]/, ''),
  );

  await outputRoot.write(
    path.join(serviceDirectory, 'quilt.project.ts'),
    await format(quiltProject, {as: 'typescript'}),
  );

  await outputRoot.write(
    path.join(serviceDirectory, entry),
    await serviceTemplate.read('service.ts'),
  );

  if (partOfMonorepo) {
    // Write the app’s package.json (the root one was already created)
    const projectPackageJson = JSON.parse(
      await serviceTemplate.read('package.json'),
    );

    adjustPackageJson(projectPackageJson, {name, entry});

    await outputRoot.write(
      path.join(serviceDirectory, 'package.json'),
      await format(JSON.stringify(projectPackageJson), {
        as: 'json-stringify',
      }),
    );

    await Promise.all([
      addToTsConfig(serviceDirectory, outputRoot),
      addToPackageManagerWorkspaces(
        serviceDirectory,
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

  const commands: string[] = [];

  if (!inWorkspace && directory !== process.cwd()) {
    commands.push(
      `cd ${color.cyan(
        relativeDirectoryForDisplay(path.relative(process.cwd(), directory)),
      )} ${color.dim('# Move into your new service’s directory')}`,
    );
  }

  if (!shouldInstall) {
    commands.push(
      `${packageManager.commands.install()} ${color.dim(
        '# Install all your dependencies',
      )}`,
    );
  }

  if (commands.length === 0) {
    console.log();
    console.log('Your new service is ready to go!');
  } else {
    const whatsNext = stripIndent`
      Your new service is ready to go! There’s just ${
        commands.length > 1 ? 'a few more steps' : 'one more step'
      } you’ll need to take
      in order to start developing:
    `;

    console.log();
    console.log(whatsNext);
    console.log();
    console.log(commands.map((command) => `  ${command}`).join('\n'));
  }

  const followUp = stripIndent`
    Quilt can also help you build, develop, test, lint, and type-check your new service.
    You can learn more about building services with Quilt by reading the documentation:
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
      '--entry': String,
      '--install': Boolean,
      '--no-install': Boolean,
      '--monorepo': Boolean,
      '--no-monorepo': Boolean,
      '--package-manager': String,
      '--extras': [String],
      '--no-extras': Boolean,
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
      message: 'What would you like to name your new service?',
      initial: 'my-service',
    });
  }

  return name!;
}

async function getEntry(argv: Arguments, {name}: {name: string}) {
  if (argv['--entry']) {
    return argv['--entry'];
  }

  const defaultEntry = `${toValidPackageName(name)}.ts`;

  const entry = await prompt({
    type: 'text',
    message: 'What do you want to name your entry file?',
    initial: defaultEntry,
  });

  return entry;
}

async function getDirectory(argv: Arguments, {name}: {name: string}) {
  let directory = path.resolve(
    argv['--directory'] ?? toValidPackageName(name!),
  );

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
        message: 'What directory do you want to create your new service in?',
      });

      directory = path.resolve(promptDirectory);
    } else {
      break;
    }
  }

  return directory;
}

function adjustPackageJson(
  packageJson: Record<string, any>,
  {
    name,
  }: {
    name: string;
    entry: string;
  },
) {
  packageJson.name = name;
  packageJson.main = `./build/runtime/runtime.js`;

  return packageJson;
}

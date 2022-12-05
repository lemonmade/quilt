import * as fs from 'fs';
import * as path from 'path';

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';

import {printHelp} from './help';
import {
  format,
  loadTemplate,
  createOutputTarget,
  mergeDependencies,
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

export async function createApp() {
  const argv = getArgv();

  if (argv['--help']) {
    const additionalOptions = stripIndent`
      ${color.cyan(`--template`)}
      The template to use for your new application. If you don’t specify a template,
      this command will ask you for one instead. Must be one of the following:

       - ${color.bold('basic')}, a web app with a minimal file structure
       - ${color.bold('single-file')}, an entire web app in a single file
    `;

    printHelp({
      kind: 'app',
      options: additionalOptions,
      packageManager: argv['--package-manager']?.toLowerCase(),
    });
    return;
  }

  const inWorkspace = fs.existsSync('quilt.workspace.ts');

  const name = await getName(argv, {inWorkspace});
  const directory = await getDirectory(argv, {name});
  const template = await getTemplate(argv);

  const createAsMonorepo = !inWorkspace && (await getCreateAsMonorepo(argv));
  const shouldInstall = await getShouldInstall(argv);
  const packageManager = await getPackageManager(argv, {root: directory});
  const setupExtras = await getExtrasToSetup(argv, {inWorkspace});

  const partOfMonorepo = inWorkspace || createAsMonorepo;

  const appDirectory = createAsMonorepo
    ? path.join(directory, 'app')
    : directory;

  if (fs.existsSync(directory)) {
    await emptyDirectory(directory);

    if (appDirectory !== directory) {
      fs.mkdirSync(appDirectory, {recursive: true});
    }
  } else {
    fs.mkdirSync(appDirectory, {recursive: true});
  }

  const rootDirectory = inWorkspace ? process.cwd() : directory;
  const outputRoot = createOutputTarget(rootDirectory);
  const appTemplate = loadTemplate(
    template === 'basic' ? 'app-basic' : 'app-single-file',
  );
  const workspaceTemplate = loadTemplate('workspace');

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

      if (packageManager.type === 'pnpm') {
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
          appTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
          appTemplate
            .read('tsconfig.json')
            .then((content) => JSON.parse(content)),
          workspaceTemplate
            .read('package.json')
            .then((content) => JSON.parse(content)),
        ]);

      workspacePackageJson.name = toValidPackageName(name!);
      workspacePackageJson.eslintConfig = projectPackageJson.eslintConfig;
      workspacePackageJson.browserslist = projectPackageJson.browserslist;
      workspacePackageJson.devDependencies = mergeDependencies(
        workspacePackageJson.devDependencies,
        projectPackageJson.devDependencies,
      );

      let quiltProject = await appTemplate.read('quilt.project.ts');
      quiltProject = quiltProject
        .replace('quiltApp', 'quiltWorkspace, quiltApp')
        .replace('quiltApp(', 'quiltWorkspace(), quiltApp(');

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

  await appTemplate.copy(appDirectory, (file) => {
    // If we are in a monorepo, we can use all the template files as they are
    if (file === 'quilt.project.ts' || file === 'tsconfig.json') {
      return partOfMonorepo;
    }

    // We need to make some adjustments the project’s package.json
    return file !== 'package.json';
  });

  if (partOfMonorepo) {
    // Write the app’s package.json (the root one was already created)
    const projectPackageJson = JSON.parse(
      await appTemplate.read('package.json'),
    );

    projectPackageJson.name = path.basename(appDirectory);

    await outputRoot.write(
      path.join(appDirectory, 'package.json'),
      await format(JSON.stringify(projectPackageJson), {
        as: 'json-stringify',
      }),
    );

    await Promise.all([
      addToTsConfig(appDirectory, outputRoot),
      addToPackageManagerWorkspaces(
        appDirectory,
        outputRoot,
        packageManager.type,
      ),
    ]);
  }

  if (shouldInstall) {
    process.stdout.write('\nInstalling dependencies...\n');
    // TODO: better loading, handle errors
    await packageManager.install();
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
    console.log('Installed dependencies.');
  }

  const commands: string[] = [];

  if (!inWorkspace && directory !== process.cwd()) {
    commands.push(
      `cd ${color.cyan(
        relativeDirectoryForDisplay(path.relative(process.cwd(), directory)),
      )} ${color.dim('# Move into your new app’s directory')}`,
    );
  }

  if (!shouldInstall) {
    commands.push(
      `${packageManager.commands.install()} ${color.dim(
        '# Install all your dependencies',
      )}`,
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

  commands.push(
    `${packageManager.commands.run('develop')} ${color.dim(
      '# Start the development server',
    )}`,
  );

  const whatsNext = stripIndent`
    Your new app is ready to go! There’s just ${
      commands.length > 1 ? 'a few more steps' : 'one more step'
    } you’ll need to take
    in order to start developing:
  `;

  console.log();
  console.log(whatsNext);
  console.log();
  console.log(commands.map((command) => `  ${command}`).join('\n'));

  const followUp = stripIndent`
    Quilt can also help you build, test, lint, and type-check your new application.
    You can learn more about building apps with Quilt by reading the documentation:
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
      '--template': String,
      '--directory': String,
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

async function getName(argv: Arguments, {inWorkspace}: {inWorkspace: boolean}) {
  let {'--name': name} = argv;

  if (name == null) {
    name = await prompt({
      type: 'text',
      message: 'What would you like to name your new app?',
      initial: inWorkspace ? 'app' : 'my-quilt-app',
    });
  }

  return name!;
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
        message: 'What directory do you want to create your new app in?',
      });

      directory = path.resolve(promptDirectory);
    } else {
      break;
    }
  }

  return directory;
}

type Template = 'basic' | 'single-file';
const VALID_TEMPLATES = new Set<Template>(['basic', 'single-file']);

async function getTemplate(argv: Arguments) {
  if (argv['--template'] && VALID_TEMPLATES.has(argv['--template'] as any)) {
    return argv['--template'] as Template;
  }

  const template = (await prompt({
    type: 'select',
    message: 'What template would you like to use?',
    hint: `Use ${color.bold('arrow keys')} to select, and ${color.bold(
      'return',
    )} to submit`,
    choices: [
      {
        title: `${color.bold(
          'The basics',
        )}, a web app with a minimal file structure`,
        value: 'basic',
      },
      {
        title: `${color.bold(
          'Itty-bitty',
        )}, an entire web app in a single file`,
        value: 'single-file',
      },
      // TODO: GraphQL API
    ],
  })) as Template;

  return template;
}

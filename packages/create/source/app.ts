import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';

import {
  format,
  prompt,
  loadTemplate,
  createOutputTarget,
  isEmpty,
  emptyDirectory,
  toValidPackageName,
  relativeDirectoryForDisplay,
} from './shared';

type Arguments = ReturnType<typeof getArgv>;

const VALID_PACKAGE_MANAGERS = new Set(['pnpm', 'npm', 'yarn']);

export async function createApp() {
  const argv = getArgv();
  const inWorkspace = fs.existsSync('quilt.workspace.ts');

  const name = await getName(argv, {inWorkspace});
  const directory = await getDirectory(argv, {name});
  const templateType = await getTemplate();

  const createAsMonorepo = !inWorkspace && (await getCreateAsMonorepo(argv));
  const shouldInstall = await getShouldInstall(argv);
  const packageManager = await getPackageManager(argv);
  const setupExtras = await getExtrasToSetup();

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

  const outputRoot = createOutputTarget(directory);
  const appTemplate = loadTemplate(
    templateType === 'basic' ? 'app-basic' : 'app-single-file',
  );
  const workspaceTemplate = loadTemplate('workspace');

  await workspaceTemplate.copy(directory, (file) => {
    // When this is a single project, we use the Quilt and TypeScript configurations
    // from the app, not the workspace version of those.
    if (!createAsMonorepo && file === 'quilt.workspace.ts') return false;

    // When this is a single project, we use the project tsconfig as the base
    return file !== 'package.json' && file !== 'tsconfig.json';
  });

  await appTemplate.copy(appDirectory, (file) => {
    if (!createAsMonorepo && file === 'quilt.project.ts') return false;

    return file !== 'tsconfig.json' && file !== 'tsconfig.json';
  });

  const [projectPackageJson, projectTSConfig, workspacePackageJson] =
    await Promise.all([
      appTemplate.read('package.json').then((content) => JSON.parse(content)),
      appTemplate.read('tsconfig.json').then((content) => JSON.parse(content)),
      workspaceTemplate
        .read('package.json')
        .then((content) => JSON.parse(content)),
    ]);

  if (createAsMonorepo) {
    workspacePackageJson.name = toValidPackageName(name!);
    projectPackageJson.name = path.basename(appDirectory);

    if (packageManager === 'npm' || packageManager === 'yarn') {
      workspacePackageJson.workspaces = [
        path.relative(directory, appDirectory),
        'packages/*',
      ];
    }

    const tsconfig = JSON.parse(await workspaceTemplate.read('tsconfig.json'));

    tsconfig.references ??= [];
    tsconfig.references.push({
      path: relativeDirectoryForDisplay(path.relative(directory, appDirectory)),
    });

    await outputRoot.write(
      'package.json',
      await format(JSON.stringify(workspacePackageJson), {
        as: 'json-stringify',
      }),
    );

    await outputRoot.write(
      path.join(appDirectory, 'package.json'),
      await format(JSON.stringify(projectPackageJson), {
        as: 'json-stringify',
      }),
    );

    await outputRoot.write(
      'tsconfig.json',
      await format(JSON.stringify(tsconfig), {as: 'json'}),
    );

    if (packageManager === 'pnpm') {
      await outputRoot.write(
        'pnpm-workspace.yaml',
        await format(
          `
            packages:
            - '${path.relative(directory, appDirectory)}'
            - 'packages/*'
          `,
          {as: 'yaml'},
        ),
      );
    }
  } else {
    workspacePackageJson.name = toValidPackageName(name!);
    workspacePackageJson.eslintConfig = projectPackageJson.eslintConfig;
    workspacePackageJson.browserslist = projectPackageJson.browserslist;

    const addBackToTSConfigInclude = new Set([
      'quilt.project.ts',
      '*.test.ts',
      '*.test.tsx',
    ]);

    projectTSConfig.exclude = projectTSConfig.exclude.filter(
      (excluded: string) => !addBackToTSConfigInclude.has(excluded),
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

  if (shouldInstall) {
    process.stdout.write('\nInstalling dependencies...\n');
    // TODO: better loading, handle errors
    let install = `${packageManager} install`;
    if (packageManager === 'npm') install += ' --legacy-peer-deps';
    execSync(install, {cwd: directory, stdio: 'inherit'});
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
    console.log('Installed dependencies.');
  }

  const commands: string[] = [];

  if (directory !== process.cwd()) {
    commands.push(
      `cd ${color.cyan(
        relativeDirectoryForDisplay(path.relative(process.cwd(), directory)),
      )} ${color.dim('# Move into your new app’s directory')}`,
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

  commands.push(`pnpm develop ${color.dim('# Start the development server')}`);

  const whatsNext = stripIndent`
    Your new app is ready to go! There’s just a few more steps you’ll need to take
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
      '--name': String,
      '--directory': String,
      '--install': Boolean,
      '--no-install': Boolean,
      '--monorepo': Boolean,
      '--no-monorepo': Boolean,
      '--package-manager': String,
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
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

async function getTemplate() {
  const templateType: 'basic' | 'single-file' = await prompt({
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
  });

  return templateType;
}

async function getCreateAsMonorepo(argv: Arguments) {
  let createAsMonorepo: boolean;

  if (argv['--monorepo']) {
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

async function getShouldInstall(argv: Arguments) {
  let shouldInstall: boolean;

  if (argv['--install']) {
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

async function getPackageManager(argv: Arguments) {
  let packageManager!: 'yarn' | 'npm' | 'pnpm';

  if (argv['--package-manager']) {
    const explicitPackageManager =
      argv['--package-manager'].toLocaleLowerCase();

    packageManager = VALID_PACKAGE_MANAGERS.has(explicitPackageManager)
      ? (explicitPackageManager as any)
      : 'npm';
  } else {
    const npmUserAgent = process.env['npm_config_user_agent'] ?? 'npm';

    if (npmUserAgent.includes('pnpm')) {
      packageManager = 'pnpm';
    } else if (npmUserAgent.includes('yarn')) {
      packageManager = 'yarn';
    } else {
      packageManager = 'npm';
    }
  }

  return packageManager;
}

async function getExtrasToSetup() {
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

  const extrasToSetup = new Set<'github' | 'vscode'>(setupExtras as any[]);

  return extrasToSetup;
}

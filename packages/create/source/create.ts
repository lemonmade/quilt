/* eslint no-console: off */

import * as fs from 'fs';
import * as path from 'path';
import {EOL} from 'os';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';
import {createRequire} from 'module';

import prompts from 'prompts';
import type {Answers} from 'prompts';
import arg from 'arg';
import * as color from 'colorette';
import {packageDirectory} from 'pkg-dir';
import {stripIndent} from 'common-tags';
import type {BuiltInParserName} from 'prettier';

const VALID_PROJECT_KINDS = new Set(['app', 'package']);
const VALID_PACKAGE_MANAGERS = new Set(['pnpm', 'npm', 'yarn']);

class CancellationError extends Error {}

const cwd = process.cwd();

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function run() {
  const permissiveArgs = arg(
    {'--help': Boolean, '-h': '--help'},
    {permissive: true},
  );

  const firstArgument = permissiveArgs._[0]?.toLowerCase();

  if (
    firstArgument != null &&
    !firstArgument.startsWith('-') &&
    !VALID_PROJECT_KINDS.has(firstArgument)
  ) {
    // TODO: show help with error message
    process.exitCode = 1;
    return;
  }

  let kind =
    firstArgument == null || !VALID_PROJECT_KINDS.has(firstArgument)
      ? undefined
      : firstArgument;

  if (permissiveArgs['--help']) {
    if (kind) {
      // TODO
    }

    printHelp();
    return;
  } else {
    const header = stripIndent`
      🧵 ${color.bold('quilt create')}
    `;

    console.log(header);
    console.log();
  }

  if (kind == null) {
    const prompt = await prompts({
      type: 'select',
      name: 'kind',
      message: 'What kind of project would you like to create?',
      choices: [
        {title: 'App', value: 'app'},
        {title: 'Package', value: 'package'},
      ],
    });

    kind = prompt.kind;
  }

  if (kind === 'app') {
    await createApp();
  }
}

async function createApp() {
  const inWorkspace = fs.existsSync('quilt.workspace.ts');

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

  let {'--name': name} = argv;

  if (name == null) {
    const prompt = await prompts({
      type: 'text',
      name: 'name',
      message: 'What would you like to name your new app?',
      initial: inWorkspace ? 'app' : 'my-quilt-app',
    });

    name = prompt.name;
  }

  let directory = path.resolve(
    argv['--directory'] ?? toValidPackageName(name!),
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(directory) && !isEmpty(directory)) {
      const relativeDirectory = path.relative(cwd, directory);

      const {empty} = await prompts({
        type: 'confirm',
        name: 'empty',
        message: `Directory ${color.bold(
          relativeDirectoryForDisplay(relativeDirectory),
        )} is not empty, is it safe to empty it?`,
        initial: true,
      });

      if (empty) break;

      const prompt = await prompts({
        type: 'text',
        name: 'directory',
        message: 'What directory do you want to create your new app in?',
      });

      directory = path.resolve(prompt.directory);
    } else {
      break;
    }
  }

  const {templateType} = await prompts({
    type: 'select',
    name: 'templateType',
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

  let createAsWorkspace: boolean;
  let shouldPerformInstallation: boolean;
  let packageManager!: 'yarn' | 'npm' | 'pnpm';

  if (inWorkspace) {
    createAsWorkspace = false;
    shouldPerformInstallation = false;
  } else {
    if (argv['--monorepo']) {
      createAsWorkspace = true;
    } else if (argv['--no-monorepo']) {
      createAsWorkspace = false;
    } else {
      const {createAsWorkspace: promptedCreateAsWorkspace} = await prompts({
        type: 'confirm',
        name: 'createAsWorkspace',
        message:
          'Do you want to create this app as a monorepo, with room for more projects?',
        initial: true,
      });

      createAsWorkspace = promptedCreateAsWorkspace;
    }

    if (argv['--install']) {
      shouldPerformInstallation = true;
    } else if (argv['--no-install']) {
      shouldPerformInstallation = false;
    } else {
      const {install: promptedInstall} = await prompts({
        type: 'confirm',
        name: 'install',
        message:
          'Do you want to install dependencies for this app after creating it?',
        initial: true,
      });

      shouldPerformInstallation = promptedInstall;
    }

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
  }

  const {setupExtras} = await prompts({
    type: 'multiselect',
    name: 'setupExtras',
    message: 'Which additional tools would you like to configure?',
    // @ts-expect-error The type definitions are incorrect
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

  const appDirectory = createAsWorkspace
    ? path.join(directory, 'app')
    : directory;

  if (fs.existsSync(directory)) {
    emptyDirectory(directory);

    if (appDirectory !== directory) {
      fs.mkdirSync(appDirectory, {recursive: true});
    }
  } else {
    fs.mkdirSync(appDirectory, {recursive: true});
  }

  // TODO: handle being in an existing workspace
  const workspaceTemplate = createTemplateFileSystem(
    await templateDirectory('workspace'),
    directory,
  );

  const templateRoot = await templateDirectory(
    templateType === 'basic' ? 'app-basic' : 'app-single-file',
  );
  const template = createTemplateFileSystem(templateRoot, appDirectory);

  for (const file of workspaceTemplate.files()) {
    // When this is a single project, we use the Quilt and TypeScript configurations
    // from the app, not the workspace version of those.
    if (file === 'quilt.workspace.ts' && !createAsWorkspace) {
      continue;
    }

    if (file === 'tsconfig.json') {
      // When this is a single project, we use the project tsconfig as the base
      if (!createAsWorkspace) continue;

      const tsconfig = JSON.parse(workspaceTemplate.read(file));

      tsconfig.references ??= [];
      tsconfig.references.push({
        path: relativeDirectoryForDisplay(
          path.relative(directory, appDirectory),
        ),
      });

      workspaceTemplate.write(
        file,
        await format(JSON.stringify(tsconfig), {as: 'json'}),
      );

      continue;
    }

    if (file === 'package.json') {
      const packageJson = JSON.parse(workspaceTemplate.read(file));
      packageJson.name = toValidPackageName(name!);

      // If this is a single project, copy over the important parts of the app package.json
      // over to the "root" one, since we only want one for the whole project
      if (createAsWorkspace) {
        if (packageManager === 'npm' || packageManager === 'yarn') {
          packageJson.workspaces = [
            path.relative(directory, appDirectory),
            'packages/*',
          ];
        }
      } else {
        const appPackageJson = JSON.parse(template.read(file));
        packageJson.eslintConfig = appPackageJson.eslintConfig;
        packageJson.browserslist = appPackageJson.browserslist;
      }

      workspaceTemplate.write(
        file,
        await format(JSON.stringify(packageJson), {as: 'json-stringify'}),
      );
      continue;
    }

    workspaceTemplate.copy(file);
  }

  if (createAsWorkspace && packageManager === 'pnpm') {
    workspaceTemplate.write(
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

  for (const file of template.files()) {
    if (file === 'package.json') {
      // When we are creating just a single project, we use the workspace’s package.json
      // as the base.
      if (!createAsWorkspace) continue;

      const packageJson = JSON.parse(template.read(file));
      packageJson.name = path.basename(appDirectory);
      template.write(
        file,
        await format(JSON.stringify(packageJson), {as: 'json-stringify'}),
      );
      continue;
    }

    if (file === 'tsconfig.json') {
      const tsconfig = JSON.parse(template.read(file));

      if (!createAsWorkspace) {
        const ADD_BACK_TO_TSCONFIG = new Set([
          'quilt.project.ts',
          '*.test.ts',
          '*.test.tsx',
        ]);

        tsconfig.exclude = tsconfig.exclude.filter(
          (excluded: string) => !ADD_BACK_TO_TSCONFIG.has(excluded),
        );
      }

      template.write(
        file,
        await format(JSON.stringify(tsconfig), {as: 'json'}),
      );

      continue;
    }

    if (file === 'quilt.project.ts' && !createAsWorkspace) {
      // When we are creating just a single project, we have to add the workspace plugin
      // to the project’s quilt configuration.
      let quiltProject = template.read(file);
      quiltProject = quiltProject
        .replace('quiltApp', 'quiltWorkspace, quiltApp')
        .replace('quiltApp(', 'quiltWorkspace(), quiltApp(');

      template.write(file, await format(quiltProject, {as: 'typescript'}));
      continue;
    }

    template.copy(file);
  }

  if (extrasToSetup.has('github')) {
    const githubTemplate = createTemplateFileSystem(
      await templateDirectory('github'),
      directory,
    );

    for (const file of githubTemplate.files()) {
      githubTemplate.copy(file);
    }
  }

  if (extrasToSetup.has('vscode')) {
    const vscodeTemplate = createTemplateFileSystem(
      await templateDirectory('vscode'),
      directory,
    );

    for (const file of vscodeTemplate.files()) {
      vscodeTemplate.copy(file);
    }
  }

  if (shouldPerformInstallation) {
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

  if (directory !== cwd) {
    commands.push(
      `cd ${color.cyan(
        relativeDirectoryForDisplay(path.relative(cwd, directory)),
      )} ${color.dim('# Move into your new app’s directory')}`,
    );
  }

  if (!shouldPerformInstallation) {
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

function printHelp() {
  const header = stripIndent`
    🧵 ${color.bold('quilt create')}

    Usage: quilt-create ${color.dim(color.magenta('[kind]'))} ${color.dim(
    color.cyan('[options]'),
  )}
  `;

  console.log(header);

  const kindSection = stripIndent`
    ${color.bold(
      color.magenta('kind'),
    )} can be one of the following project types:

     - ${color.magenta('app')}, a web application
     - ${color.magenta('package')}, a shared library of code

    You’ll be asked a few additional questions based on the kind you choose.
  `;

  console.log();
  console.log(kindSection);

  const optionsSection = stripIndent`
    ${color.bold(color.cyan('options'))} can include any of these flags:

     ${color.cyan('--name')}
     The name of the project. When creating a package, you should use the public name you
     want for the package, including any scope you want to use (example: ${color.bold(
       '@my-org/my-package',
     )}).
     If you don’t provide a name with this flag, this command will ask you for one later.

     ${color.cyan('--directory')}
     The directory to create the project in. If you don’t provide this flag, Quilt will pick
     a default directory based on the kind of the project and the name you provided.

     ${color.cyan('--monorepo')}
     If you aren’t already in a monorepo, this flag will create your new project with some
     additional structure that allows it to be a monorepo — that is, you will be able to add
     multiple projects to a single repository.

     ${color.cyan('--install')}
     Whether to install dependencies in the newly created project. If you do not provide this
     flag, Quilt will ask you about it later.

     ${color.cyan('--package-manager')}
     The package manager to use for your new project. This choice will be used to populate
     some commands, and will be used to install dependencies if the ${color.cyan(
       '--install',
     )} flag is set.

     Must be one of the following: ${color.bold('pnpm')}, ${color.bold(
    'npm',
  )}, or ${color.bold('yarn')}.

     ${color.cyan('--help')}, ${color.cyan('-h')}
     Prints this help documentation.
  `;

  console.log();
  console.log(optionsSection);
}

async function createPackage(explicitName?: string) {
  let name!: string;
  let scope: string | undefined;
  let targetDirectory!: string;

  let result: Answers<'name' | 'overwrite'>;

  try {
    result = await prompts<'name' | 'overwrite'>(
      [
        {
          type: 'text',
          name: 'name',
          message: 'What would you like to name this package?',
          initial: toValidPackageName(explicitName ?? ''),
          onState: (state) => {
            name = toValidPackageName(state.value);
            scope = name.match(/^@[^/]+/)?.[0] ?? undefined;
            targetDirectory = path.join(
              'packages',
              scope ? name.replace(`${scope}/`, '') : name,
            );
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDirectory!) || isEmpty(targetDirectory!)
              ? (null as any)
              : 'confirm',
          name: 'overwrite',
          message: () =>
            `Target directory (${targetDirectory}) is not empty. Remove existing files and continue?`,
          onState: (overwrite: boolean) => {
            if (overwrite === false) {
              throw new CancellationError();
            }
          },
        },
      ],
      {
        onCancel: () => {
          throw new CancellationError();
        },
      },
    );
  } catch (cancelled) {
    if (cancelled instanceof CancellationError) return;
    throw cancelled;
  }

  const {overwrite} = result;

  const root = path.join(cwd, targetDirectory!);

  if (overwrite) {
    emptyDirectory(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, {recursive: true});
  }

  console.log(
    `\nCreating ${color.cyan(name)} package in ${color.cyan(
      path.relative(cwd, root),
    )}...`,
  );

  const templateRoot = await templateDirectory('package');
  const template = createTemplateFileSystem(templateRoot, root);

  for (const file of template.files()) {
    switch (file) {
      case 'package.json': {
        const packageJson = JSON.parse(template.read(file));
        packageJson.name = name;

        if (scope) {
          packageJson.publishConfig[`${scope}:registry`] =
            'https://registry.npmjs.org';
        }

        template.write(
          file,
          await format(JSON.stringify(packageJson), {as: 'json'}),
        );
        break;
      }
      case 'README.md': {
        template.write(
          file,
          template.read(file).replace('# Package', `# ${name}`),
        );
        break;
      }
      default: {
        template.copy(file);
      }
    }

    if (file === 'package.json') {
      const packageJson = JSON.parse(template.read(file));
      packageJson.name = name;

      if (scope) {
        packageJson.publishConfig[`${scope}:registry`] =
          'https://registry.npmjs.org';
      }

      template.write(file, JSON.stringify(packageJson, null, 2) + EOL);
      continue;
    }

    template.copy(file);
  }

  console.log(`\nDone! Your new package has been created.`);
  console.log(`Get started by adding source code in the \`source\` directory.`);
  console.log(
    `Make sure to edit the \`description\` and \`repository\` sections of your \`package.json\` before publishing.`,
  );
  console.log(`Have fun!`);
  console.log();
}

// Utilities

function createTemplateFileSystem(templateRoot: string, targetRoot: string) {
  return {
    write(file: string, content: string) {
      const targetPath = path.join(
        targetRoot,
        file.startsWith('_') ? `.${file.slice(1)}` : file,
      );
      fs.writeFileSync(targetPath, content);
    },
    copy(file: string) {
      const targetPath = path.join(
        targetRoot,
        file.startsWith('_') ? `.${file.slice(1)}` : file,
      );
      copy(path.join(templateRoot, file), targetPath);
    },
    read(file: string) {
      return fs.readFileSync(path.join(templateRoot, file), {encoding: 'utf8'});
    },
    files() {
      return fs
        .readdirSync(templateRoot)
        .filter((file) => !path.basename(file).startsWith('.'));
    },
  };
}

async function templateDirectory(
  name:
    | 'package'
    | 'app-basic'
    | 'app-single-file'
    | 'workspace'
    | 'github'
    | 'vscode',
) {
  const packageRoot = await packageDirectory({
    cwd: path.dirname(fileURLToPath(import.meta.url)),
  });

  return path.join(packageRoot, 'templates', name);
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~@/]+/g, '-');
}

function copy(source: string, destination: string) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    copyDirectory(source, destination);
  } else {
    fs.copyFileSync(source, destination);
  }
}

function copyDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, {recursive: true});
  for (const file of fs.readdirSync(source)) {
    const srcFile = path.resolve(source, file);
    const destFile = path.resolve(destination, file);
    copy(srcFile, destFile);
  }
}

function isEmpty(path: string) {
  return fs.readdirSync(path).length === 0;
}

function emptyDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), {force: true, recursive: true});
  }
}

function relativeDirectoryForDisplay(relativeDirectory: string) {
  return relativeDirectory.startsWith('.')
    ? relativeDirectory
    : `.${path.sep}${relativeDirectory}`;
}

const require = createRequire(import.meta.url);

async function format(content: string, {as: parser}: {as: BuiltInParserName}) {
  const [{format}, prettierOptions] = await Promise.all([
    import('prettier'),
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Promise.resolve(require('@quilted/prettier')),
  ]);
  return format(content, {...prettierOptions, parser});
}

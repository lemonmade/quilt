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

export async function createApp() {
  const argv = getArgv();

  if (argv['--help']) {
    const additionalOptions = stripIndent`
      ${color.cyan(`--template`)}
      The template to use for your new application. If you don’t specify a template,
      this command will ask you for one instead. Must be one of the following:

      - ${color.bold(
        'empty',
      )}, a basic React app without any extra runtime dependencies
       - ${color.bold('basic')}, a web app with a minimal file structure
       - ${color.bold(
         'graphql',
       )}, a web app with a GraphQL API, fetched using @tanstack/react-query
       - ${color.bold(
         'trpc',
       )}, a web app with a tRPC API, fetched using @tanstack/react-query
    `;

    printHelp({
      kind: 'app',
      options: additionalOptions,
      packageManager: argv['--package-manager']?.toLowerCase(),
    });
    return;
  }

  const inWorkspace = await getInWorkspace(argv);
  const name = await getName(argv, {inWorkspace});
  const directory = await getDirectory(argv, {name});
  const template = await getTemplate(argv);

  const createAsMonorepo =
    !inWorkspace &&
    (await getCreateAsMonorepo(argv, {
      type: 'app',
      default: true,
    }));
  const setupExtras = await getExtrasToSetup(argv, {inWorkspace});
  const shouldInstall = await getShouldInstall(argv);
  const packageManager = await getPackageManager(argv, {root: directory});

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
  const appTemplate = loadTemplate(`app-${template}`);
  const workspaceTemplate = loadTemplate('workspace');

  if (!inWorkspace) {
    await workspaceTemplate.copy(directory, (file) => {
      // We will adjust the package.json before writing it
      return file !== 'package.json';
    });

    if (setupExtras.has('github')) {
      await loadTemplate('github').copy(directory);
    }

    if (setupExtras.has('vscode')) {
      await loadTemplate('vscode').copy(directory);
    }
  }

  if (createAsMonorepo) {
    const workspacePackageJson = JSON.parse(
      await workspaceTemplate.read('package.json'),
    );

    workspacePackageJson.name = `${toValidPackageName(name!)}-workspace`;

    const moduleRelativeToRoot = relativeDirectoryForDisplay(
      path.relative(directory, appDirectory),
    );

    await outputRoot.write(
      'pnpm-workspace.yaml',
      await format(
        `
            packages:
            - './packages/*'
            - '${moduleRelativeToRoot}'
          `,
        {as: 'yaml'},
      ),
    );

    await outputRoot.write(
      'package.json',
      await format(JSON.stringify(workspacePackageJson), {
        as: 'json-stringify',
      }),
    );
  }

  await appTemplate.copy(appDirectory, (file) => {
    // We need to merge the project gitignore with the workspace one
    if (file === '_gitignore') return partOfMonorepo;

    // We will adjust the package.json before writing it
    return file !== 'package.json';
  });

  if (template === 'graphql' && !inWorkspace) {
    const relativeFromRootToAppPath = (filePath: string) =>
      path.relative(outputRoot.root, path.join(appDirectory, filePath));

    await outputRoot.write(
      'graphql.config.ts',
      stripIndent`
        import {type Configuration} from '@quilted/craft/graphql';

        const configuration: Configuration = {
          schema: '${relativeFromRootToAppPath('graphql/schema.graphql')}',
          documents: ['${relativeFromRootToAppPath('**/*.graphql')}'],
          extensions: {
            quilt: {
              schema: [{kind: 'definitions', outputPath: '${relativeFromRootToAppPath(
                'graphql/schema.ts',
              )}'}],
            },
          },
        };
        
        export default configuration;      
      ` + '\n',
    );
  }

  if (partOfMonorepo) {
    // Write the app’s package.json (the root one was already created)
    const projectPackageJson = JSON.parse(
      await appTemplate.read('package.json'),
    );

    projectPackageJson.name = toValidPackageName(name!);

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
  } else {
    // Write the package’s package.json by combining elements of the root and
    // package templates
    const [projectPackageJson, workspacePackageJson] = await Promise.all([
      appTemplate.read('package.json').then((content) => JSON.parse(content)),
      workspaceTemplate
        .read('package.json')
        .then((content) => JSON.parse(content)),
    ]);

    const mergedPackageJson = mergeWorkspaceAndProjectPackageJsons(
      projectPackageJson,
      workspacePackageJson,
    );

    mergedPackageJson.name = toValidPackageName(name!);

    await outputRoot.write(
      'package.json',
      await format(JSON.stringify(mergedPackageJson), {
        as: 'json-stringify',
      }),
    );

    if (await appTemplate.has('_gitignore')) {
      await outputRoot.write(
        path.join(appDirectory, '.gitignore'),
        `${await outputRoot.read('.gitignore')}\n${await appTemplate.read(
          '_gitignore',
        )}`,
      );
    }
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

type Template = 'basic' | 'graphql' | 'trpc' | 'empty';
const VALID_TEMPLATES = new Set<Template>([
  'basic',
  'graphql',
  'trpc',
  'empty',
]);

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
          'Empty',
        )}, a basic React app without any extra runtime dependencies`,
        value: 'empty',
      },
      {
        title: `${color.bold(
          'The basics',
        )}, a web app with a minimal file structure`,
        value: 'basic',
      },
      {
        title: `${color.bold(
          'GraphQL',
        )}, a web app with a GraphQL API, fetched using @tanstack/react-query`,
        value: 'graphql',
      },
      {
        title: `${color.bold(
          'tRPC',
        )}, a web app with a tRPC API, fetched using @tanstack/react-query`,
        value: 'trpc',
      },
    ],
  })) as Template;

  return template;
}

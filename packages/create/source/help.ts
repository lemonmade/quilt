import {stripIndent, color} from '@quilted/cli-kit';

export function printHelp({
  kind,
  options: customOptions,
  packageManager,
}: {
  kind?: 'app' | 'package' | 'module';
  options?: string;
  packageManager?: string;
} = {}) {
  const command = createCommand(packageManager);

  const usage = stripIndent`
    ${color.bold('Usage:')}   ${command} ${
    kind ? color.magenta(kind) : color.magenta('[kind]')
  } ${color.green('[name]')} ${color.cyan('[options]')}
  `;

  console.log(usage);

  const example = stripIndent`
    ${color.bold('Example:')} ${command} ${color.magenta(
    kind ?? 'app',
  )} ${color.green(`my-${kind ?? 'app'}`)} ${color.cyan('--install')}
  `;

  console.log(color.dim(example));

  if (!kind) {
    const kindSection = stripIndent`
    ${color.bold(
      color.magenta('kind'),
    )} can be one of the following project types:

     - ${color.magenta('app')}, a web application
     - ${color.magenta('package')}, a shared library of code
     - ${color.magenta('module')}, a standalone JavaScript module for a browser

    You’ll be asked a few additional questions based on the kind you choose.
  `;

    console.log();
    console.log(kindSection);
  }

  const optionsSection = stripIndent`
    ${color.cyan('--name')}
    The name of the project. When creating a package, you should use the public name you
    want for the package, including any scope you want to use (example: ${color.bold(
      '@my-org/my-package',
    )}).
    If you don’t provide a name with this flag, this command will ask you for one later.

    ${color.cyan('--directory')}
    The directory to create the project in. If you don’t provide this flag, Quilt will pick
    a default directory based on the kind of the project and the name you provided.

    ${color.cyan(`--monorepo`)}, ${color.cyan(`--no-monorepo`)}
    If you aren’t already in a monorepo, this flag will create your new project with some
    additional structure that allows it to be a monorepo — that is, you will be able to add
    multiple projects to a single repository.

    ${color.cyan(`--install`)}, ${color.cyan(`--no-install`)}
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

    ${color.cyan(`--extras`)}, ${color.cyan(`--no-extras`)}
    Extra developer tools to configure when creating your new project. This option only
    applies when creating a brand new project, not when adding a project to an existing
    workspace. You can include this flag multiple times to add multiple tools. You can
    enable any of the following tools:

     - ${color.bold(
       'github',
     )}, which adds a continuous integration (CI) GitHub Action to your project.
     - ${color.bold(
       'vscode',
     )}, which adds some basic VSCode settings to your project.

    ${color.cyan('--yes')}, ${color.cyan('-y')}
    Answers “yes” to any question this command would have asked.

    ${color.cyan('--help')}, ${color.cyan('-h')}
    Prints this help documentation.
  `;

  console.log();
  console.log(
    `${color.bold(color.cyan('options'))} can include any of these flags:`,
  );

  if (customOptions) {
    console.log();
    console.log(printOptionsSection(customOptions));
  }

  console.log();
  console.log(printOptionsSection(optionsSection));
}

function printOptionsSection(section: string) {
  return section
    .split('\n')
    .map((line) => (line.length > 0 ? ` ${line}` : line))
    .join('\n');
}

function createCommand(explicitPackageManager?: string) {
  let packageManager: string;

  const npmUserAgent = process.env['npm_config_user_agent'] ?? 'npm';

  if (npmUserAgent.includes('pnpm') || explicitPackageManager === 'pnpm') {
    packageManager = 'pnpm';
  } else if (
    npmUserAgent.includes('yarn') ||
    explicitPackageManager === 'yarn'
  ) {
    packageManager = 'yarn';
  } else {
    packageManager = 'npm';
  }

  return `${packageManager} create @quilted`;
}

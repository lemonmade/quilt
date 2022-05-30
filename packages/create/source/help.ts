import * as color from 'colorette';
import {stripIndent} from 'common-tags';

export function printHelp() {
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

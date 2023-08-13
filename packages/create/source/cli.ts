/* eslint no-console: off */

import {AbortError, stripIndent, color, parseArguments} from '@quilted/cli-kit';

import {printHelp} from './help.ts';
import {prompt} from './shared.ts';

const VALID_PROJECT_KINDS = new Set(['app', 'package', 'module', 'service']);

run().catch((error) => {
  if (AbortError.test(error)) return;

  console.error(error);
  process.exitCode = 1;
});

async function run() {
  const permissiveArgs = parseArguments(
    {'--help': Boolean, '-h': '--help', '--package-manager': String},
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

  const header = stripIndent`
      🧵 ${color.bold('quilt create')}
    `;

  console.log(header);
  console.log();

  if (permissiveArgs['--help'] && !kind) {
    printHelp({
      packageManager: permissiveArgs['--package-manager']?.toLowerCase(),
    });
    return;
  }

  if (kind == null) {
    kind = await prompt({
      type: 'select',
      message: 'What kind of project would you like to create?',
      choices: [
        {title: 'App', value: 'app'},
        {title: 'Module', value: 'module'},
        {title: 'Package', value: 'package'},
        {title: 'Backend service', value: 'service'},
      ],
    });
  }

  switch (kind) {
    case 'app': {
      const {createApp} = await import('./app.ts');
      await createApp();
      break;
    }
    case 'module': {
      const {createModule} = await import('./module.ts');
      await createModule();
      break;
    }
    case 'package': {
      const {createProject} = await import('./package.ts');
      await createProject();
      break;
    }
    case 'service': {
      const {createService} = await import('./service.ts');
      await createService();
      break;
    }
  }
}

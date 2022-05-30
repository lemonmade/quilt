/* eslint no-console: off */

import arg from 'arg';
import * as color from 'colorette';
import {stripIndent} from 'common-tags';
import {AbortError} from '@quilted/events';

import {printHelp} from './help';
import {prompt} from './shared';

const VALID_PROJECT_KINDS = new Set(['app', 'package']);

run().catch((error) => {
  if (AbortError.test(error)) return;

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
    kind = await prompt({
      type: 'select',
      message: 'What kind of project would you like to create?',
      choices: [
        {title: 'App', value: 'app'},
        {title: 'Package', value: 'package'},
      ],
    });
  }

  if (kind === 'app') {
    const {createApp} = await import('./app');
    await createApp();
  }
}

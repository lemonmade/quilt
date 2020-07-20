/* eslint no-console: off */

import arg from 'arg';
import {dim, inverse, bold, green, red} from 'colorette';

import {createBuilder} from './builder';

const BUILT = inverse(bold(green(' BUILT ')));
const ERROR = inverse(bold(red(' ERROR ')));

run();

async function run() {
  const argv = arg({'--cwd': String, '--watch': Boolean});

  const {'--watch': watch = false, '--cwd': cwd} = argv;

  const builder = await createBuilder(cwd);

  builder.on('schema:build:end', ({schemaTypes}) => {
    console.log(`${BUILT} schema types → ${schemaTypes[0].outputPath}`);
  });

  builder.on('document:build:end', ({documentPath}) => {
    console.log(`${BUILT} ${dim(documentPath)} → ${documentPath}.d.ts`);
  });

  builder.on('error', (error) => {
    console.log(`${ERROR} ${error.message}`);

    if (error.stack) {
      console.log(dim(error.stack));
    }

    console.log();

    if (!watch) {
      process.exit(1);
    }
  });

  if (watch) {
    await builder.watch();
  } else {
    await builder.run();
  }
}

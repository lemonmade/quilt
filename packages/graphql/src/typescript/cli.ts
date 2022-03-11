/* eslint no-console: off */

import * as path from 'path';

import arg from 'arg';
import {dim, inverse, bold, green, red} from 'colorette';

import type {SchemaOutputKind} from '../configuration';

import {createBuilder} from './builder';

const BUILT = inverse(bold(green(' BUILT ')));
const ERROR = inverse(bold(red(' ERROR ')));

run();

async function run() {
  const argv = arg({'--cwd': String, '--watch': Boolean});

  const {'--watch': watch = false, '--cwd': cwd} = argv;

  const builder = await createBuilder(cwd);

  builder.on('schema:build:end', ({outputKinds}) => {
    for (const outputKind of outputKinds) {
      console.log(
        `${BUILT} ${dim(
          `${schemaBuildMessage(outputKind)} → `,
        )}${outputKind.outputPath!}`,
      );
    }
  });

  builder.on('document:build:end', ({documentPath, outputKinds}) => {
    const isType = outputKinds.some(({kind}) => kind === 'types');

    console.log(
      `${BUILT} ${documentPath.replace(path.join(process.cwd(), '/'), '')}${dim(
        isType ? '.d.ts' : '.ts',
      )}`,
    );
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

function schemaBuildMessage({kind}: SchemaOutputKind) {
  switch (kind) {
    case 'inputTypes':
      return 'schema (input) types';
    case 'outputTypes':
      return 'schema (output) types';
    case 'definitions':
      return 'schema definitions';
  }
}

import * as path from 'path';
import {fileURLToPath} from 'url';
import {spawn} from 'child_process';
import {promisify} from 'util';

import {packageDirectory} from 'pkg-dir';

const spawnAsync = promisify(spawn);

const [, , command, ...args] = process.argv;

if (command === 'graphql-types') {
  await spawnAsync('quilt-graphql-typescript', [...args], {
    stdio: 'inherit',
    cwd: path.join(
      (await packageDirectory({
        cwd: path.dirname(fileURLToPath(import.meta.url)),
      }))!,
      'node_modules/.bin',
    ),
  });
}

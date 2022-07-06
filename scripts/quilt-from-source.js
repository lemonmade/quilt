import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/craft/source/cli/cli.ts');

try {
  execSync(
    [
      'node',
      '--no-warnings',
      '--experimental-specifier-resolution=node',
      '--experimental-vm-modules',
      '--loader',
      resolve(root, './scripts/esbuild-module-loader.js'),
      '--conditions',
      'quilt:source',
      cli,
      ...process.argv.slice(2),
    ].join(' '),
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        QUILT_FROM_SOURCE: '1',
      },
    },
  );
} catch (error) {
  process.exitCode = 1;
}

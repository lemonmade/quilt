import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'packages/craft/src/cli/cli.ts');

try {
  execSync(
    [
      'node',
      '--no-warnings',
      '--loader',
      resolve(root, './scripts/esbuild-module-loader.js'),
      '--conditions',
      'quilt:from-source',
      cli,
      ...process.argv.slice(2),
      '--projects',
      '"./quilt.workspace.ts"',
      '--projects',
      '"./packages/**/quilt.project.ts"',
      '--projects',
      '"!./packages/create-quilt-app/template/quilt.project.ts"',
    ].join(' '),
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        SEWING_KIT_FROM_SOURCE: '1',
      },
    },
  );
} catch (error) {
  process.exitCode = 1;
}

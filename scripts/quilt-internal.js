import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

const fromSource = resolve(
  dirname(fileURLToPath(import.meta.url)),
  './quilt-from-source.js',
);

try {
  execSync(
    [
      'node',
      fromSource,
      ...process.argv.slice(2),
      '--projects',
      '\\"./quilt.workspace.ts\\"',
      '--projects',
      '\\"./packages/**/quilt.project.ts\\"',
      '--projects',
      '\\"./integrations/**/quilt.project.ts\\"',
      '--projects',
      '\\"!./packages/create-quilt-app/template/quilt.project.ts\\"',
      '--projects',
      '\\"!./packages/create/templates/**/quilt.project.ts\\"',
    ].join(' '),
    {
      stdio: 'inherit',
    },
  );
} catch (error) {
  process.exitCode = 1;
}

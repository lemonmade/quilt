import * as path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
import {packageDirectory} from 'pkg-dir';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App, Service} from '@quilted/sewing-kit';

const STEP_NAME = 'Quilt.ExposeDependencies';
const require = createRequire(import.meta.url);

// Quilt lists a number of dependencies in its own package.json that we
// directly import as part of the creation of “magic” entry points. The
// project does not directly depend on these packages, and so strict package
// managers (like pnpm) will create a `node_modules` structure where the
// consumer can’t directly import those packages. This plugin configures
// rollup to also look in Quilt’s own dependencies to resolve node_modules.
export function exposeQuiltDependencies() {
  return createProjectPlugin<App | Service>({
    name: STEP_NAME,
    build({configure}) {
      configure(({rollupNodeResolveOptions}) => {
        rollupNodeResolveOptions?.(async (options) => {
          const [ownPackageDirectory, quiltPackageDirectory] =
            await Promise.all([
              packageDirectory({
                cwd: path.dirname(fileURLToPath(import.meta.url)),
              }),
              packageDirectory({
                cwd: path.dirname(require.resolve('@quilted/quilt')),
              }),
            ]);

          return {
            ...options,
            moduleDirectories: [
              ...(options.moduleDirectories ?? ['node_modules']),
              path.join(ownPackageDirectory, 'node_modules'),
              path.join(quiltPackageDirectory, 'node_modules'),
            ],
          };
        });
      });
    },
  });
}

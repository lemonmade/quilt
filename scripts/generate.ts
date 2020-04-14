/* eslint import/no-extraneous-dependencies: off */

import * as path from 'path';
import args from 'arg';
import {writeFile, readJSON, writeJSON, mkdirp, remove} from 'fs-extra';

const rootDirectory = path.resolve(__dirname, '..');
const packagesDirectory = path.join(rootDirectory, 'packages');

(async () => {
  const {
    _: [name],
    '--consumer': consumers = ['quilt'],
  } = args({
    '--consumer': [String],
  });

  const packageDirectory = path.join(packagesDirectory, name);

  await write(path.join(packageDirectory, 'src/index.ts'), '');
  await write(path.join(packageDirectory, 'tsconfig.json'), {
    extends: '../../config/typescript/tsconfig.base.json',
    compilerOptions: {
      baseUrl: 'src',
      rootDir: 'src',
      outDir: 'build/ts',
      paths: {},
    },
    include: ['src'],
    exclude: ['**/tests/**/*.ts', '**/tests/**/*.tsx'],
  });
  await write(
    path.join(packageDirectory, 'README.md'),
    `# \`@quilted/${name}\`\n\n`,
  );
  await write(path.join(packageDirectory, 'package.json'), {
    name: `@quilted/${name}`,
    version: '0.0.0',
    publishConfig: {
      access: 'public',
      '@quilted:registry': 'https://registry.npmjs.org',
    },
    main: 'index.js',
    module: 'index.mjs',
    license: 'MIT',
    sideEffects: false,
    ...(name.includes('react')
      ? {
          peerDependencies: {
            react: '>=16.3.0 <17.0.0',
          },
        }
      : {}),
  });
  await write(
    path.join(packageDirectory, 'sewing-kit.config.ts'),
    `${`
import {createPackage} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.use(quiltPackage());
});
`.trim()}\n`,
  );

  await addProjectReference(path.join(rootDirectory, 'tsconfig.json'), name);

  for (const consumer of consumers) {
    await addProjectReference(
      path.join(packagesDirectory, consumer, 'tsconfig.json'),
      name,
    );

    await addPackageDependency(
      path.join(packagesDirectory, consumer, 'package.json'),
      name,
    );
  }
})();

async function addPackageDependency(file: string, name: string) {
  const pkg = await readJSON(file);
  const dependencies = Object.entries(pkg.dependencies ?? {});
  if (pkg.dependencies == null || !(`@quilted/${name}` in pkg.dependencies))
    dependencies.push([`@quilted/${name}`, '^0.0.0']);

  pkg.dependencies = Object.fromEntries(
    dependencies.sort(([one], [two]) => one.localeCompare(two)),
  );
  await write(file, pkg);
}

async function addProjectReference(file: string, name: string) {
  const tsconfig = await readJSON(file);
  const relative = path.relative(
    path.dirname(file),
    path.join(packagesDirectory, name),
  );
  const normalizedRelative = relative.startsWith('.')
    ? relative
    : `./${relative}`;

  const references = tsconfig.references ? [...tsconfig.references] : [];
  if (references.every(({path}) => path !== normalizedRelative)) {
    references.push({path: normalizedRelative});
  }

  tsconfig.references = references.sort(
    ({path: pathOne}: {path: string}, {path: pathTwo}) =>
      pathOne.localeCompare(pathTwo),
  );
  await write(file, tsconfig);
}

async function write(file: string, contents: string | object) {
  await mkdirp(path.dirname(file));

  if (typeof contents === 'string') {
    await writeFile(file, contents);
  } else {
    await writeJSON(file, contents, {spaces: 2});
  }
}

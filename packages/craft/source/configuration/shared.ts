import {dirname, basename} from 'path';
import {PackageJson} from '../kit';

const DIRECTORIES_NOT_TO_USE_FOR_NAME = new Set(['src', 'source', 'lib']);

export function nameFromFileSystem(
  root: string,
  {packageJson}: {packageJson?: PackageJson},
) {
  const rootDirectoryName = dirname(root);

  return (
    nameFromPackageJson(packageJson) ??
    (DIRECTORIES_NOT_TO_USE_FOR_NAME.has(rootDirectoryName)
      ? basename(dirname(root))
      : rootDirectoryName)
  );
}

function nameFromPackageJson(packageJson?: PackageJson) {
  const name = packageJson?.name;

  if (!name) return undefined;

  // Take the base part of a scoped package name, or the whole
  // package name if not scoped.
  return name.startsWith('@') ? name.split('/')[1] : name;
}

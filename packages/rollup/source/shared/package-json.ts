import * as path from 'path';
import {fileURLToPath} from 'url';
import {readFile} from 'fs/promises';

export interface PackageJSON {
  name?: string;
  [key: string]: unknown;
}

export async function loadPackageJSON(root: string | URL) {
  const file = await readFile(
    path.join(
      typeof root === 'string' ? root : fileURLToPath(root),
      'package.json',
    ),
    'utf8',
  );

  return JSON.parse(file) as PackageJSON;
}

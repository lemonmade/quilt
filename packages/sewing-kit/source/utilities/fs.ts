import {join, resolve, relative, dirname} from 'path';

import {
  appendFile,
  readFile,
  mkdir,
  copyFile,
  unlink,
  writeFile,
} from 'fs/promises';
import {globbySync} from 'globby';
import type {Options as GlobbyOptions} from 'globby';

import type {
  FileSystem as FSType,
  UserFileSystem as UserFSType,
  InternalFileSystem as InternalFSType,
} from '../types';

class BaseFileSystem implements FSType {
  constructor(public readonly root: string) {}

  async read(file: string) {
    return readFile(this.resolvePath(file), 'utf8');
  }

  async write(file: string, contents: string) {
    const resolved = this.resolvePath(file);
    await mkdir(dirname(resolved), {recursive: true});
    await writeFile(resolved, contents);
  }

  async append(file: string, contents: string) {
    const resolved = this.resolvePath(file);
    await mkdir(dirname(resolved), {recursive: true});
    await appendFile(resolved, contents);
  }

  async remove(file: string) {
    const resolved = this.resolvePath(file);
    await unlink(resolved);
  }

  async copy(from: string, to: string) {
    const resolvedFrom = this.resolvePath(from);
    const resolvedTo = this.resolvePath(to);

    await copyFile(resolvedFrom, resolvedTo);
  }

  async hasFile(file: string) {
    const matches = await this.glob(file, {onlyFiles: true});
    return matches.length > 0;
  }

  async hasDirectory(dir: string) {
    const matches = await this.glob(dir.endsWith('/') ? dir : `${dir}/`);
    return matches.length > 0;
  }

  async glob(pattern: string, options: GlobbyOptions = {}) {
    return globbySync(pattern, {cwd: this.root, absolute: true, ...options});
  }

  resolvePath(...paths: string[]) {
    return resolve(this.root, ...paths);
  }

  relativePath(path: string) {
    return relative(this.root, path);
  }
}

export class FileSystem extends BaseFileSystem implements UserFSType {
  buildPath(...paths: string[]) {
    return this.resolvePath('build', ...paths);
  }
}

export class InternalFileSystem
  extends BaseFileSystem
  implements InternalFSType
{
  constructor(root: string, {name = '.sewing-kit'} = {}) {
    super(join(root, name));
  }

  tempPath(...paths: string[]) {
    return this.resolvePath('temp', ...paths);
  }
}

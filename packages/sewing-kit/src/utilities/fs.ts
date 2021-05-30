import {resolve, relative, dirname} from 'path';

import {
  appendFile,
  readFile,
  mkdir,
  copyFile,
  unlink,
  writeFile,
} from 'fs/promises';
import glob, {GlobbyOptions} from 'globby';

import type {FileSystem as FSType} from '../types';

export class FileSystem implements FSType {
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

  async glob(pattern: string, options: Omit<GlobbyOptions, 'cwd'> = {}) {
    return glob.sync(pattern, {...options, cwd: this.root, absolute: true});
  }

  buildPath(...paths: string[]) {
    return this.resolvePath('build', ...paths);
  }

  resolvePath(...paths: string[]) {
    return resolve(this.root, ...paths);
  }

  relativePath(path: string) {
    return relative(this.root, path);
  }
}

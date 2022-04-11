import {readFileSync} from 'fs';
import {join} from 'path';

interface PackageJsonInternal {
  [key: string]: unknown;
}

export class PackageJson {
  static load(root: string) {
    try {
      return new PackageJson(root);
    } catch {
      return undefined;
    }
  }

  get name() {
    return this.raw.name as string | undefined;
  }

  get private() {
    return Boolean(this.raw.private ?? false);
  }

  get dependencies() {
    return (this.raw.dependencies as Record<string, string>) ?? {};
  }

  get devDependencies() {
    return (this.raw.devDependencies as Record<string, string>) ?? {};
  }

  readonly path: string;
  readonly raw: PackageJsonInternal;

  constructor(root: string) {
    this.path = join(root, 'package.json');
    this.raw = JSON.parse(readFileSync(this.path, {encoding: 'utf8'}));
  }

  dependency(dependency: string) {
    return (this.raw.dependencies as Record<string, string>)?.[dependency];
  }

  devDependency(dependency: string) {
    return (this.raw.devDependencies as Record<string, string>)?.[dependency];
  }
}

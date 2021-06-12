import {FileSystem} from '../utilities/fs';
import {PackageJson} from '../utilities/dependencies';
import type {ProjectKind} from '../types';

export interface Options {
  readonly name: string;
  readonly root: string;
}

export interface DependencyOptions {
  all?: boolean;
  dev?: boolean;
  prod?: boolean;
}

export interface BaseProject {
  readonly id: string;
  readonly name: string;
  readonly root: string;
  readonly kind: ProjectKind;
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  dependency(name: string): {version: string} | undefined;
  hasDependency(name: string): boolean;
  dependencies(options?: DependencyOptions): string[];
}

export class Base implements Omit<BaseProject, 'id' | 'kind'> {
  readonly name: string;
  readonly root: string;
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  constructor({name, root}: Options) {
    this.name = name;
    this.root = root;
    this.fs = new FileSystem(root);
    this.packageJson = PackageJson.load(this.root);
  }

  dependencies({prod, dev, all}: DependencyOptions = {prod: true}) {
    const dependencies: string[] = [];

    if (this.packageJson == null) {
      return dependencies;
    }

    if (prod || all) {
      dependencies.push(...Object.keys(this.packageJson.dependencies));
    }

    if (dev || all) {
      dependencies.push(...Object.keys(this.packageJson.devDependencies));
    }

    return dependencies;
  }

  dependency(name: string) {
    if (!this.hasDependency(name)) return undefined;

    try {
      return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        version: require(`${name}/package.json`).version,
      };
    } catch {
      return undefined;
    }
  }

  hasDependency(
    name: string,
    _options?: DependencyOptions & {version?: string},
  ): boolean {
    const {packageJson} = this;

    return packageJson != null && packageJson.dependency(name) != null;
  }
}

export function toId(name: string) {
  return name
    .split(/[-_]/g)
    .map((part) => `${part[0].toLocaleUpperCase()}${part.slice(1)}`)
    .join('');
}

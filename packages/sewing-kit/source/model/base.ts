import {FileSystem} from '../utilities/fs';
import {PackageJson} from '../utilities/dependencies';

export interface Options {
  readonly name: string;
  readonly root: string;
  readonly configuration: Configuration;
}

export interface Configuration {
  readonly path: string;
}

export interface DependencyOptions {
  all?: boolean;
  dev?: boolean;
  prod?: boolean;
}

export class Base {
  readonly name: string;
  readonly root: string;
  readonly configuration: Configuration;
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  constructor({name, root, configuration}: Options) {
    this.name = name;
    this.root = root;
    this.configuration = configuration;
    this.fs = new FileSystem(root);
    this.packageJson = PackageJson.load(this.root);
  }

  dependencies({prod = true, dev, all}: DependencyOptions = {}) {
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

  hasDependency(
    name: string,
    {dev, prod = true, all}: DependencyOptions = {},
  ): boolean {
    const {packageJson} = this;

    if (packageJson == null) return false;

    if ((prod || all) && packageJson.dependency(name) != null) return true;

    if ((dev || all) && packageJson.devDependency(name) != null) return true;

    return false;
  }
}

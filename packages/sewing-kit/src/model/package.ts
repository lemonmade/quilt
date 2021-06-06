import {Runtime, ProjectKind} from '../types';

import {Base, toId} from './base';
import type {Options as BaseOptions} from './base';

export interface PackageEntryOptions {
  readonly name?: string;
  readonly source: string;
  readonly runtime?: Runtime;
  readonly runtimes?: Runtime[];
}

export class PackageEntry {
  readonly name: string | undefined;
  readonly source: string;
  readonly runtimes: Runtime[] | undefined;

  constructor({name, source, runtime, runtimes}: PackageEntryOptions) {
    this.name = name;
    this.source = source;
    this.runtimes = runtime ? [runtime] : runtimes;
  }
}

export interface PackageBinaryOptions {
  readonly name: string;
  readonly source: string;
  readonly aliases?: readonly string[];
}

export class PackageBinary {
  readonly name: string;
  readonly source: string;
  readonly aliases: readonly string[];

  constructor({name, source, aliases = []}: PackageBinaryOptions) {
    this.name = name;
    this.source = source;
    this.aliases = aliases;
  }
}

export interface PackageOptions extends BaseOptions {
  runtimes?: Runtime[];
  readonly entries?: readonly PackageEntryOptions[];
  readonly binaries?: readonly PackageBinaryOptions[];
}

export class Package extends Base {
  readonly kind = ProjectKind.Package;
  readonly runtimes: Runtime[] | undefined;
  readonly entries: readonly PackageEntry[];
  readonly binaries: readonly PackageBinary[];

  get id() {
    return `Package.${toId(this.name)}`;
  }

  get runtimeName() {
    return this.packageJson?.name ?? this.name;
  }

  constructor({
    entries = [],
    binaries = [],
    runtimes,
    ...rest
  }: PackageOptions) {
    super(rest);

    this.runtimes = runtimes;
    this.entries = entries.map((entry) => new PackageEntry(entry));
    this.binaries = binaries.map((binary) => new PackageBinary(binary));
  }
}

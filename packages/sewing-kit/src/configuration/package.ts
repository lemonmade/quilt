import type {ProjectPlugin} from '../plugins';
import type {Runtime} from '../types';
import type {
  Package,
  PackageOptions,
  PackageEntryOptions,
  PackageBinaryOptions,
} from '../model';

import {ConfigurationBuilder, ConfigurationKind} from './base';

class PackageBuilder extends ConfigurationBuilder<
  ProjectPlugin<Package>,
  PackageOptions
> {
  constructor(root: string) {
    super(root, ConfigurationKind.Package);
  }

  /**
   * Configure the default runtime that is used for all entries of
   * this package.
   */
  runtime(defaultRuntime: Runtime) {
    this.options.runtimes = [defaultRuntime];
    return this;
  }

  /**
   * Configure the default runtimes that are used for all entries of
   * this package.
   */
  runtimes(...defaultRuntimes: Runtime[]) {
    this.options.runtimes = defaultRuntimes;
    return this;
  }

  /**
   * Add a new entry to this package. Entries are modules in your project
   * that you want consumers to be able to import from. You can use them
   * to organize different collections of functionality in your package;
   * for example, you may want a separate entry in a browser-focused package
   * for testing or server-side utilities.
   *
   * When creating an entry, you can supply the runtime(s) it will execute
   * in, the source module this entry corresponds to, and the `name` you want
   * consumers to use to import this package. If you do not supply a `name`
   * for the entry, this is assumed to be the “root” entry — the one a
   * consumer should get when they import the root of your package.
   */
  entry({runtime, runtimes, ...entry}: PackageEntryOptions) {
    this.options.entries = this.options.entries ?? [];
    this.options.entries.push({
      ...entry,
      source:
        typeof entry.source === 'string' && entry.source.startsWith('/')
          ? entry.source.slice(1)
          : entry.source,
      runtimes: runtime ? [runtime] : runtimes ?? this.options.runtimes,
    });

    return this;
  }

  /**
   * Defines a binary that this package provides for consumers to execute.
   * Like entries, binaries are created with a name and the source they
   * correspond to.
   */
  binary(binary: PackageBinaryOptions) {
    this.options.binaries = this.options.binaries ?? [];
    this.options.binaries.push(binary);
    return this;
  }
}

/**
 * Defines a new package. The first argument should be a function that
 * is called with a “builder” object. You can call the methods on this
 * builder to configure the basic details about your package, and to include
 * the plugins you want to use.
 */
export function createPackage(
  create: (pkg: PackageBuilder) => void | Promise<void>,
) {
  return async (root: string) => {
    const builder = new PackageBuilder(root);
    await create(builder);
    return builder.finalize();
  };
}

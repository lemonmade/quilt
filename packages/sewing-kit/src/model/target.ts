import {Runtime} from '../types';

import {Package} from './package';
import {App} from './app';
import {Service} from './service';

export class TargetRuntime {
  static fromProject(project: Service | App | Package) {
    if (project instanceof Service) {
      return new TargetRuntime([Runtime.Node]);
    }

    if (project instanceof App) {
      return new TargetRuntime([Runtime.Browser]);
    }

    const runtimes = new Set(project.runtimes ?? []);

    for (const entry of project.entries) {
      if (entry.runtimes) {
        for (const entryRuntime of entry.runtimes) {
          runtimes.add(entryRuntime);
        }
      }
    }

    return new TargetRuntime(runtimes);
  }

  readonly runtimes: Set<Runtime>;

  constructor(runtimes: Iterable<Runtime>) {
    this.runtimes = new Set(runtimes);
  }

  includes(runtime: Runtime) {
    return this.runtimes.size === 0 || this.runtimes.has(runtime);
  }
}

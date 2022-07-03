import {Runtime} from '../types';
import type {Project} from './project';

export class TargetRuntime {
  static fromProject(_project: Project) {
    return new TargetRuntime([]);
  }

  readonly runtimes: Set<Runtime>;

  constructor(runtimes: Iterable<Runtime>) {
    this.runtimes = new Set(runtimes);
  }

  includes(runtime: Runtime) {
    return this.runtimes.size === 0 || this.runtimes.has(runtime);
  }
}

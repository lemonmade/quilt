import type {Project} from './project';

export class TargetRuntime {
  static fromProject(_project: Project) {
    return new TargetRuntime([]);
  }

  readonly runtimes: Set<any>;

  constructor(runtimes: Iterable<any>) {
    this.runtimes = new Set(runtimes);
  }

  includes(runtime: any) {
    return this.runtimes.size === 0 || this.runtimes.has(runtime);
  }
}

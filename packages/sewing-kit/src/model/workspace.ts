import {Base} from './base';
import type {Options as BaseOptions} from './base';

import type {App} from './app';
import type {Service} from './service';
import type {Package} from './package';

export interface WorkspaceOptions extends BaseOptions {
  readonly apps: readonly App[];
  readonly packages: readonly Package[];
  readonly services: readonly Service[];
}

export class Workspace extends Base {
  readonly apps: readonly App[];
  readonly packages: readonly Package[];
  readonly services: readonly Service[];

  get projects() {
    return [...this.packages, ...this.apps, ...this.services];
  }

  constructor({apps, packages, services, ...rest}: WorkspaceOptions) {
    super(rest);

    this.apps = apps;
    this.packages = packages;
    this.services = services;
  }
}

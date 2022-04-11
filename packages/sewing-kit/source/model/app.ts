import {ProjectKind} from '../types';

import {Base, toId} from './base';
import type {Options as BaseOptions, BaseProject} from './base';

export interface AppOptions extends BaseOptions {
  readonly entry?: string;
}

export class App extends Base implements BaseProject {
  readonly kind = ProjectKind.App;
  readonly entry?: string;

  get id() {
    return `App.${toId(this.name)}`;
  }

  constructor({entry, ...rest}: AppOptions) {
    super(rest);

    this.entry = entry;
  }
}

import {ProjectKind} from '../types';

import {Base, toId} from './base';
import type {Options as BaseOptions} from './base';

export interface AppOptions extends BaseOptions {
  readonly entry?: string;
}

export class App extends Base {
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

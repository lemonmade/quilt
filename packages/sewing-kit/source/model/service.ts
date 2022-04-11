import {ProjectKind} from '../types';

import {Base, toId} from './base';
import type {Options as BaseOptions, BaseProject} from './base';

export interface ServiceOptions extends BaseOptions {
  readonly entry?: string;
}

export class Service extends Base implements BaseProject {
  readonly kind = ProjectKind.Service;
  readonly entry?: string;

  get id() {
    return `Service.${toId(this.name)}`;
  }

  constructor({entry, ...rest}: ServiceOptions) {
    super(rest);
    this.entry = entry;
  }
}

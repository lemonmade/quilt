import {Base, type Options as BaseOptions} from './base.ts';

export interface ProjectOptions extends BaseOptions {}

export class Project extends Base {
  readonly kind = 'project';

  get id() {
    return toId(this.name);
  }
}

function toId(name: string) {
  return name
    .split(/[-_]/g)
    .map((part) => `${part[0]!.toLocaleUpperCase()}${part.slice(1)}`)
    .join('');
}

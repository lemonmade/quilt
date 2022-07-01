import {Base} from './base';
import type {Project} from './project';

export type WorkspaceOptions = ConstructorParameters<typeof Base>[0] & {
  readonly projects: Project[];
};

export class Workspace extends Base {
  readonly kind = 'workspace';
  readonly projects: Project[];

  constructor({projects, ...options}: WorkspaceOptions) {
    super(options);
    this.projects = projects;
  }
}

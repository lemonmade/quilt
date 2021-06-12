import type {App} from './app';
import type {Package} from './package';
import type {Service} from './service';

export type {BaseProject} from './base';

export {Package, PackageBinary, PackageEntry} from './package';
export type {
  PackageBinaryOptions,
  PackageEntryOptions,
  PackageOptions,
} from './package';

export {App} from './app';
export type {AppOptions} from './app';

export {Service} from './service';
export type {ServiceOptions} from './service';

export type Project = App | Service | Package;

export {Workspace} from './workspace';
export type {WorkspaceOptions} from './workspace';

export {TargetRuntime} from './target';

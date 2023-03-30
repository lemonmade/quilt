import type {
  WorkspacePlugin,
  ProjectPlugin,
  FileSystem,
  PackageJson,
} from '../kit.ts';

export interface ConfigurationContext {
  root: string;
  file: string;
}

export interface WorkspaceConfiguration {
  (context: ConfigurationContext): Promise<WorkspaceConfigurationResult>;
}

export interface WorkspaceConfigurationBuilder {
  readonly root: string;
  readonly file: string;
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  name(name: string): this;
  projects(...patterns: string[]): this;
  use(...plugins: (WorkspacePlugin | false | undefined | null)[]): this;

  result(): WorkspaceConfigurationResult;
}

export interface WorkspaceConfigurationResult {
  readonly kind: 'workspace';
  readonly root: string;
  readonly file: string;
  readonly name: string;
  readonly plugins: readonly WorkspacePlugin[];
  readonly projects: readonly string[];
}

export interface ProjectConfiguration {
  (context: ConfigurationContext): Promise<ProjectConfigurationResult>;
}

export interface ProjectConfigurationBuilder {
  readonly root: string;
  readonly file: string;
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  name(name: string): this;
  use(
    ...plugins: (ProjectPlugin | WorkspacePlugin | false | undefined | null)[]
  ): this;

  result(): ProjectConfigurationResult;
}

export interface ProjectConfigurationResult {
  readonly kind: 'project';
  readonly root: string;
  readonly file: string;
  readonly name: string;
  readonly plugins: readonly ProjectPlugin[];
  readonly workspacePlugins: readonly WorkspacePlugin[];
}

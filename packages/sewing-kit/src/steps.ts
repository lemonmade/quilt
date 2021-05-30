import type {Project} from './model';
import type {Loggable} from './types';

// TODO
export interface BaseStepRunner {
  exec(command: string, options?: any): Promise<void>;
}

export interface ProjectStepRunner<_ProjectType extends Project>
  extends BaseStepRunner {}

export type ProjectStepStage = 'pre' | 'default' | 'post';

export interface ProjectStep<ProjectType extends Project> {
  readonly name: string;
  readonly label: Loggable;
  readonly stage?: ProjectStepStage;
  run(runner: ProjectStepRunner<ProjectType>): void | Promise<void>;
}

export interface WorkspaceStepRunner extends BaseStepRunner {}

export type WorkspaceStepStage =
  | 'pre'
  | 'before-projects'
  | 'default'
  | 'after-projects'
  | 'post';

export interface WorkspaceStep {
  readonly name: string;
  readonly label: Loggable;
  readonly stage?: WorkspaceStepStage;
  run(runner: WorkspaceStepRunner): void | Promise<void>;
}

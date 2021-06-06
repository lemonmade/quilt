import type {ExecFileOptions, PromiseWithChild} from 'child_process';

import type {Project} from './model';
import type {Log, Loggable} from './types';

export interface StepRunnerExecOptions extends ExecFileOptions {
  /**
   * You can use this option to indicate that the command being run was
   * installed as part of a node module. When this option is `true`,
   * sewing-kit will prepend the path to the workspace’s node module
   * binary directory (typically, `<root>/node_modules/.bin`).
   */
  fromNodeModules?: boolean;
}

export type StepRunnerExecResult = PromiseWithChild<{
  stdout: string;
  stderr: string;
}>;

// TODO
export interface BaseStepRunner {
  readonly log: Log;
  fail(): void;
  exec(
    command: string,
    args?: string[] | null,
    options?: StepRunnerExecOptions,
  ): StepRunnerExecResult;
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

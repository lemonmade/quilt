import type {ExecFileOptions, PromiseWithChild} from 'child_process';

import type {Project, Workspace} from './model';
import type {WorkspacePlugin, AnyPlugin} from './plugins';
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

export type StepStage = 'pre' | 'default' | 'post';

export interface StepNeed {
  readonly need: boolean;
  readonly allowSkip?: boolean;
}

export interface ProjectStep<ProjectType extends Project> {
  readonly name: string;
  readonly label: Loggable;
  // I want to make this `ProjectType`, but when I do that, it blows up the
  // feature where you can pass `ProjectPlugin<Project>` in place of a plugin
  // for the specific project type. I don’t know why, and it’s not a huge
  // loss in type safety, but would definitely love to find a better way!
  readonly target: Project;
  readonly stage: StepStage;
  readonly source: AnyPlugin;
  run(runner: ProjectStepRunner<ProjectType>): void | Promise<void>;
  needs?(otherStep: AnyStep): boolean | StepNeed;
}

export interface WorkspaceStepRunner extends BaseStepRunner {}

export interface WorkspaceStep {
  readonly name: string;
  readonly label: Loggable;
  readonly target: Workspace;
  readonly stage: StepStage;
  readonly source: WorkspacePlugin;
  run(runner: WorkspaceStepRunner): void | Promise<void>;
  needs?(otherStep: WorkspaceStep): boolean | StepNeed;
}

export type AnyStep = WorkspaceStep | ProjectStep<Project>;

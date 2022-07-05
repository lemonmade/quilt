import type {
  ExecOptions,
  SpawnOptions,
  PromiseWithChild,
  ChildProcess,
} from 'child_process';

import type {Project, Workspace} from './model';
import type {WorkspacePlugin, AnyPlugin} from './plugins';
import type {Log, Loggable} from './types';

export interface StepRunnerExecOptions extends ExecOptions {
  /**
   * You can use this option to indicate that the command being run was
   * installed as a binary for a node module. You should pass this option
   * the `import.meta.url` so that we can select the correct binary location
   * for this module. When set to `true`, this script will assume you want
   * to get the current working directory's binary directory.
   */
  fromNodeModules?: string | boolean;
}

export interface StepRunnerSpawnOptions extends SpawnOptions {
  /**
   * You can use this option to indicate that the command being run was
   * installed as a binary for a node module. You should pass this option
   * the `import.meta.url` so that we can select the correct binary location
   * for this module. When set to `true`, this script will assume you want
   * to get the current working directory's binary directory.
   */
  fromNodeModules?: string | boolean;
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
  spawn(
    command: string,
    args?: string[] | null,
    options?: StepRunnerSpawnOptions,
  ): ChildProcess;
}

export interface ProjectStepRunner extends BaseStepRunner {}

export type StepStage = 'pre' | 'default' | 'post';

export interface StepNeed {
  readonly need: boolean;
  readonly allowSkip?: boolean;
}

export interface ProjectStep {
  readonly name: string;
  readonly label: Loggable;
  readonly target: Project;
  readonly stage: StepStage;
  readonly source: AnyPlugin;
  run(runner: ProjectStepRunner): void | Promise<void>;
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

export type AnyStep = WorkspaceStep | ProjectStep;

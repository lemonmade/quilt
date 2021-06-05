import type {Project} from '../model';
import type {ProjectStep, WorkspaceStep} from '../steps';
import type {ValueOrPromise, InternalFileSystem} from '../types';

export const NONE = Symbol.for('SewingKit.None');
export type None = typeof NONE;

export type SequenceHookArguments<Arg1 = None, Arg2 = None, Arg3 = None> =
  Arg1 extends None
    ? []
    : Arg2 extends None
    ? [Arg1]
    : Arg3 extends None
    ? [Arg1, Arg2]
    : [Arg1, Arg2, Arg3];

/**
 * A `SequenceHook` accepts at least one argument. It is called with
 * some set of arguments, and each function that hooks in is called
 * with those arguments in sequence (they can do so asynchronously).
 */
export interface SequenceHook<Args extends any[] = []> {
  (hook: (...args: Args) => void | Promise<void>): void;
  run(...args: Args): Promise<void>;
}

export type WaterfallHookArguments<
  Value,
  Arg1 = None,
  Arg2 = None,
  Arg3 = None,
> = Arg1 extends None
  ? [Value]
  : Arg2 extends None
  ? [Value, Arg1]
  : Arg3 extends None
  ? [Value, Arg1, Arg2]
  : [Value, Arg1, Arg2, Arg3];

/**
 * A `WaterfallHook` accepts at least one argument. The first argument
 * is special: it is the result of calling previous waterfall hooks
 * on an initial value (you can start this process by calling `#run()`).
 * Each function that hooks into a `WaterfallHook` must return an
 * updated version of the first argument, which will then be passed
 * to subsequent hooks, and can do so asynchronously.
 */
export interface WaterfallHook<Value = unknown, Args extends any[] = []> {
  (hook: (value: Value, ...args: Args) => Value | Promise<Value>): void;
  run(value: Value, ...args: Args): Promise<Value>;
}

export function createSequenceHook<Args extends any[] = []>() {
  const hooks: ((...args: Args) => void | Promise<void>)[] = [];

  const sequenceHook: SequenceHook<Args> = (hook) => {
    hooks.push(hook);
  };

  sequenceHook.run = async (...args) => {
    for (const hook of hooks) {
      await hook(...args);
    }
  };

  return sequenceHook;
}

export function createWaterfallHook<
  Value = unknown,
  Args extends any[] = [],
>() {
  const hooks: ((value: Value, ...args: Args) => Value | Promise<Value>)[] = [];

  const waterfallHook: WaterfallHook<Value, Args> = (hook) => {
    hooks.push(hook);
  };

  waterfallHook.run = async (initial, ...args) => {
    let result: Value = initial;

    for (const hook of hooks) {
      result = await (hook as any)(result, ...args);
    }

    return result;
  };

  return waterfallHook;
}

// === === === ===
// UTILITIES
// === === === ===

/**
 * Represents the resolved custom hooks, including the fact that they
 * are no longer mutable (after the creation phase) and that they are
 * always optional, as there is no guarantee the plugin that added the
 * type is actually included in a given project.
 */
export type ResolvedHooks<T> = {
  readonly [K in keyof T]?: T[K];
};

/**
 * Represents the resolved custom options, including the fact that they
 * are no longer mutable (after the creation phase) and that they are
 * always optional.
 */
export type ResolvedOptions<T> = {
  readonly [K in keyof T]?: T[K];
};

// TODO
export interface HookAdderHelper {
  sequence<Args extends any[] = []>(): SequenceHook<Args>;
  waterfall<Value, Args extends any[] = []>(): WaterfallHook<Value, Args>;
}

// TODO
export interface HookAdder<AllowedHooks> {
  <T = Partial<AllowedHooks>>(adder: (hooks: HookAdderHelper) => T): void;
}

export interface ConfigurationCollector<
  ConfigurationHooks,
  ConfigurationContext,
> {
  (
    collector: (
      configuration: ConfigurationHooks,
      context: ConfigurationContext,
    ) => ValueOrPromise<void>,
  ): void;
}

// TODO
export interface ProjectStepAdderContext<
  ProjectConfigurationHooks,
  ProjectOptions,
> {
  configuration(options?: ProjectOptions): Promise<ProjectConfigurationHooks>;
}

export interface ProjectStepAdder<
  ProjectType extends Project,
  ProjectConfigurationHooks,
  ProjectOptions,
> {
  (
    adder: (
      step: (step: ProjectStep<ProjectType>) => ProjectStep<ProjectType>,
      context: ProjectStepAdderContext<
        ProjectConfigurationHooks,
        ProjectOptions
      >,
    ) => ValueOrPromise<
      | ProjectStep<ProjectType>
      | ProjectStep<ProjectType>[]
      | null
      | undefined
      | false
    >,
  ): void;
}

// TODO
export interface WorkspaceStepAdderContext<
  WorkspaceConfigurationHooks,
  WorkspaceOptions,
> {
  configuration(
    options?: WorkspaceOptions,
  ): Promise<WorkspaceConfigurationHooks>;
}

export interface WorkspaceStepAdder<
  Context extends WorkspaceStepAdderContext<any, any>,
> {
  (
    adder: (
      step: (step: WorkspaceStep) => WorkspaceStep,
      context: Context,
    ) => ValueOrPromise<
      WorkspaceStep | WorkspaceStep[] | null | undefined | false
    >,
  ): void;
}

export interface SewingKitInternalContext {
  readonly fs: InternalFileSystem;
}

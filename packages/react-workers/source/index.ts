export {
  createWorker,
  createThreadWorker,
  retain,
  release,
  createThread,
  createThreadFromWebWorker,
} from '@quilted/workers';
export type {
  Thread,
  ThreadOptions,
  ThreadTarget,
  ThreadCallable,
  ThreadCallableFunction,
  ThreadSafeArgument,
  ThreadSafeReturnType,
  ThreadSafeReturnValueType,
  CustomWorker,
  CustomWorkerConstructor,
  CustomThreadWorker,
  CustomThreadWorkerConstructor,
  CustomWorkerModuleResolver,
} from '@quilted/workers';

export {useThreadWorker} from './hooks.ts';

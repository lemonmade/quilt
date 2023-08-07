export {
  retain,
  release,
  createThread,
  createThreadFromWebWorker,
} from '@quilted/threads';
export type {
  Thread,
  ThreadTarget,
  ThreadOptions,
  ThreadCallable,
  ThreadCallableFunction,
  ThreadSafeArgument,
  ThreadSafeReturnType,
  ThreadSafeReturnValueType,
} from '@quilted/threads';

export {createWorker, type BasicWorkerCreator} from './create/basic.ts';
export {createThreadWorker, type ThreadWorkerCreator} from './create/thread.ts';

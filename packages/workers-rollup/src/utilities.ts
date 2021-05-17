import type {WorkerWrapper} from './types';

export function wrapperToSearchParams(wrapper: WorkerWrapper) {
  return new URLSearchParams(Object.entries(wrapper));
}

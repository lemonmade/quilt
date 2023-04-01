import {URLSearchParams} from 'url';
import type {WorkerWrapper} from './types.ts';

export function wrapperToSearchParams(wrapper: WorkerWrapper) {
  return new URLSearchParams(Object.entries(wrapper));
}

export function wrapperToSearchString(wrapper: WorkerWrapper) {
  return `?${wrapperToSearchParams(wrapper).toString()}`;
}

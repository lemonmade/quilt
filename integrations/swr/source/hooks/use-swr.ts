import useBaseSWR from 'swr';
import type {SWRHook} from 'swr';
import {useServerRenderedSWR} from './use-server-rendered-swr';

export const useSWR: SWRHook = (...args: [any, any?, any?]) => {
  useServerRenderedSWR(...args);
  return useBaseSWR(...args);
};

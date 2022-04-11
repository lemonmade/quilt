import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';

export const endpoint =
  typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
    ? createEndpoint<unknown>(fromWebWorker(self as any), {
        callable: [],
      })
    : undefined;

import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';
import type {CreateEndpointOptions} from '@remote-ui/rpc';

export function createEndpointFromWorker<T = unknown>(
  options?: CreateEndpointOptions<T>,
) {
  if (
    typeof WorkerGlobalScope === 'undefined' ||
    !(self instanceof WorkerGlobalScope)
  ) {
    throw new Error(
      'You must run this function in an environment where `self` is a worker.',
    );
  }

  return createEndpoint(fromWebWorker(self as any), {
    callable: [],
    ...options,
  });
}

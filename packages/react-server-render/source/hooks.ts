import {createUseContextHook} from '@quilted/react-utilities';

import {ServerRenderManagerContext} from './context';
import {
  ServerActionKind,
  ServerActionPerform,
  ServerActionOptions,
  ServerRenderRequestContext,
} from './types';

const useServerRenderManager = createUseContextHook(ServerRenderManagerContext);

export function useServerAction(
  perform: ServerActionPerform,
  kind?: ServerActionKind,
  options?: ServerActionOptions,
) {
  const manager = useServerRenderManager({required: false});
  manager?.perform(perform, kind, options);
}

export function useServerContext<Required extends boolean = false>({
  required = false as Required,
}: {required?: Required} = {}): Required extends true
  ? ServerRenderRequestContext
  : ServerRenderRequestContext | undefined {
  const manager = useServerRenderManager<Required>({required});
  return manager?.context as any;
}

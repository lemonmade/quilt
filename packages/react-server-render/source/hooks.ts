import {useContext} from 'react';
import {
  createUseContextHook,
  createUseOptionalValueHook,
} from '@quilted/react-utilities';

import {ServerRenderManagerContext} from './context.ts';
import {
  ServerActionKind,
  ServerActionPerform,
  ServerActionOptions,
} from './types.ts';

const useServerRenderManager = createUseContextHook(ServerRenderManagerContext);

export function useServerAction(
  perform: ServerActionPerform,
  kind?: ServerActionKind,
  options?: ServerActionOptions,
) {
  const manager = useServerRenderManager({required: false});
  manager?.perform(perform, kind, options);
}

export const useServerContext = createUseOptionalValueHook(
  () => useContext(ServerRenderManagerContext)?.context,
);

import {useContext} from 'react';

import {ServerRenderContext} from './context';
import {
  ServerActionKind,
  ServerActionPerform,
  ServerActionOptions,
} from './types';

export function useServerAction(
  perform: ServerActionPerform,
  kind?: ServerActionKind,
  options?: ServerActionOptions,
) {
  const manager = useContext(ServerRenderContext);
  manager?.perform(perform, kind, options);
}

import {useContext} from 'react';

import {ServerRenderContext} from './context';
import {ServerRenderEffectKind, ServerRenderEffectAction} from './types';

export function useServerEffect(perform: ServerRenderEffectAction, kind?: ServerRenderEffectKind) {
  const manager = useContext(ServerRenderContext);
  manager?.performEffect(perform, kind);
}

import {useContext} from 'react';

import {ServerRenderContext} from './context';
import {
  ServerRenderEffectKind,
  ServerRenderEffectAction,
  ServerRenderEffectOptions,
} from './types';

export function useServerEffect(
  perform: ServerRenderEffectAction,
  kind?: ServerRenderEffectKind,
  options?: ServerRenderEffectOptions,
) {
  const manager = useContext(ServerRenderContext);
  manager?.performEffect(perform, kind, options);
}

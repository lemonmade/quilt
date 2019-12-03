import {useServerEffect} from './hook';
import {ServerRenderEffectKind, ServerRenderEffectAction} from './types';

interface Props {
  kind?: ServerRenderEffectKind;
  perform: ServerRenderEffectAction;
}

export function ServerEffect({kind, perform}: Props) {
  useServerEffect(perform, kind);
  return null;
}

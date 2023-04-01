import {useServerAction} from './hooks.ts';
import {ServerActionKind, ServerActionPerform} from './types.ts';

interface Props {
  kind?: ServerActionKind;
  perform: ServerActionPerform;
}

export function ServerAction({kind, perform}: Props) {
  useServerAction(perform, kind);
  return null;
}

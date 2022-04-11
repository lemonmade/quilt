import {useServerAction} from './hook';
import {ServerActionKind, ServerActionPerform} from './types';

interface Props {
  kind?: ServerActionKind;
  perform: ServerActionPerform;
}

export function ServerAction({kind, perform}: Props) {
  useServerAction(perform, kind);
  return null;
}

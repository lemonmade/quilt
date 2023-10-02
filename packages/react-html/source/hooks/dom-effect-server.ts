import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';
import type {ServerActionOptions} from '@quilted/react-server-render';

import {HTMLContext} from '../context.ts';
import {SERVER_ACTION_KIND, type HTMLManager} from '../manager.ts';

export function useDomServerAction(
  perform: (manager: HTMLManager) => void,
  options?: ServerActionOptions,
) {
  const manager = useContext(HTMLContext);
  useServerAction(() => perform(manager), manager[SERVER_ACTION_KIND], options);
}

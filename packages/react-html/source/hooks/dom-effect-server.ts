import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';
import type {ServerActionOptions} from '@quilted/react-server-render';

import {HtmlContext} from '../context.ts';
import {SERVER_ACTION_KIND, type HtmlManager} from '../manager.ts';

export function useDomServerAction(
  perform: (manager: HtmlManager) => void,
  options?: ServerActionOptions,
) {
  const manager = useContext(HtmlContext);
  useServerAction(() => perform(manager), manager[SERVER_ACTION_KIND], options);
}

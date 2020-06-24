import {useContext} from 'react';
import {
  useServerAction,
  ServerActionOptions,
} from '@quilted/react-server-render';

import {HtmlContext} from '../context';
import {HtmlManager, SERVER_ACTION_KIND} from '../manager';

export function useDomServerAction(
  perform: (manager: HtmlManager) => void,
  options?: ServerActionOptions,
) {
  const manager = useContext(HtmlContext);
  useServerAction(() => perform(manager), manager[SERVER_ACTION_KIND], options);
}

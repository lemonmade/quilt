import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {EmailContext} from '../context';
import type {EmailManager} from '../manager';

export function useEmailAction(perform: (email: EmailManager) => void) {
  const email = useContext(EmailContext);

  useServerAction(() => {
    if (email) perform(email);
  }, email?.actionKind);
}

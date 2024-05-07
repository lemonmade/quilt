import {useContext} from 'preact/hooks';

import {EmailContext} from '../context.ts';
import type {EmailManager} from '../manager.ts';

export function useEmailAction(perform: (email: EmailManager) => void) {
  const email = useContext(EmailContext);
  if (email) perform(email);
}

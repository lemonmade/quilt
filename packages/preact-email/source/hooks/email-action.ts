import {useEmailManager} from '../context.ts';
import type {EmailManager} from '../manager.ts';

export function useEmailAction(perform: (email: EmailManager) => void) {
  const email = useEmailManager();
  if (email) perform(email);
}

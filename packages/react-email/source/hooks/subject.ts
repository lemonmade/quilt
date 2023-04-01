import {useEmailAction} from './email-action.ts';

export function useSubject(subject: string | undefined) {
  return useEmailAction((email) => email.setSubject(subject));
}

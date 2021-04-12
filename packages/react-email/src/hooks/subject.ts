import {useEmailAction} from './email-action';

export function useSubject(subject: string | undefined) {
  return useEmailAction((email) => email.setSubject(subject));
}

import {useEmailAction} from './email-action.ts';

export function useSendBcc(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendBcc(emails));
}

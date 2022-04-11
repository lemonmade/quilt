import {useEmailAction} from './email-action';

export function useSendBcc(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendBcc(emails));
}

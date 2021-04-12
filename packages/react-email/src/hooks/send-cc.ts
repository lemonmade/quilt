import {useEmailAction} from './email-action';

export function useSendCc(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendCc(emails));
}

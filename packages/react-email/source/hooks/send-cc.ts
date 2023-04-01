import {useEmailAction} from './email-action.ts';

export function useSendCc(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendCc(emails));
}

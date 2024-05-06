import {useEmailAction} from './email-action.ts';

export function useSendBCC(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendBCC(emails));
}

import {useEmailAction} from './email-action.ts';

export function useSendCC(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendCC(emails));
}

import {useEmailAction} from './email-action.ts';

export function useSendTo(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendTo(emails));
}

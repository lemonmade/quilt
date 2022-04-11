import {useEmailAction} from './email-action';

export function useSendTo(emails: string | string[] | undefined) {
  return useEmailAction((email) => email.sendTo(emails));
}

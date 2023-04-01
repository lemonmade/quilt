import type {Sender} from '../types.ts';
import {useEmailAction} from './email-action.ts';

export function useSender(sender: string | Sender | undefined) {
  return useEmailAction((email) => email.setSender(sender));
}

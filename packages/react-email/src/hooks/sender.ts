import type {Sender} from '../types';
import {useEmailAction} from './email-action';

export function useSender(sender: string | Sender | undefined) {
  return useEmailAction((email) => email.setSender(sender));
}

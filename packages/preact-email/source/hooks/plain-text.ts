import type {EmailManager} from '../manager.ts';
import {useEmailAction} from './email-action.ts';

export function usePlainTextContent(
  text: Parameters<EmailManager['setPlainText']>[0],
) {
  return useEmailAction((email) => email.setPlainText(text));
}

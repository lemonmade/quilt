import type {Sender} from './types.ts';

export interface State {
  readonly subject?: string;
  readonly sender?: Sender;
  readonly to?: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly plainText?: string;
}

export interface Options {
  readonly plainText?: boolean;
}

export class EmailManager {
  private readonly options: Required<Options>;

  private subject: string | undefined;
  private sender: string | Sender | undefined;
  private to: string[] | undefined;
  private cc: string[] | undefined;
  private bcc: string[] | undefined;
  private plainText: string | undefined;

  constructor({plainText = true}: Options = {}) {
    this.options = {
      plainText,
    };
  }

  get state(): State {
    return {
      subject: this.subject,
      sender:
        typeof this.sender === 'string' ? {email: this.sender} : this.sender,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      plainText: this.plainText,
    };
  }

  setSubject(subject: string | undefined) {
    this.subject = subject;
  }

  setSender(sender: string | Sender | undefined) {
    this.sender = sender;
  }

  sendTo(emails: string | string[] | undefined) {
    this.to = typeof emails === 'string' ? [emails] : emails;
  }

  sendCC(emails: string | string[] | undefined) {
    this.cc = typeof emails === 'string' ? [emails] : emails;
  }

  sendBCC(emails: string | string[] | undefined) {
    this.bcc = typeof emails === 'string' ? [emails] : emails;
  }

  setPlainText(text: string | undefined | (() => string | undefined)) {
    if (!this.options.plainText) return;
    this.plainText = typeof text === 'function' ? text() : text;
  }

  reset() {
    this.subject = undefined;
    this.sender = undefined;
    this.to = undefined;
    this.cc = undefined;
    this.bcc = undefined;
  }
}

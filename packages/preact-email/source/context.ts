import {useQuiltContext} from '@quilted/preact-context';
import type {EmailManager} from './manager.ts';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * The email manager for this render, used to collect email metadata
     * (subject, sender, recipients, plain-text content) during server-side
     * rendering of an email component.
     */
    readonly email?: EmailManager;
  }
}

export function useEmailManager() {
  return useQuiltContext('email', {optional: true});
}

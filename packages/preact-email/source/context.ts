import {createOptionalContext} from '@quilted/preact-context';
import type {EmailManager} from './manager.ts';

export const EmailContext = createOptionalContext<EmailManager>();

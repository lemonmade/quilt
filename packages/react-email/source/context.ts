import {createContext} from 'react';
import type {EmailManager} from './manager.ts';

export const EmailContext = createContext<EmailManager | null>(null);

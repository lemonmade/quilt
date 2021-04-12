import {createContext} from 'react';
import type {EmailManager} from './manager';

export const EmailContext = createContext<EmailManager | null>(null);

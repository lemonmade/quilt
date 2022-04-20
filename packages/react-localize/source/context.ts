import {createContext} from 'react';
import type {LocalizedFormatting} from '@quilted/localize';

export const LocalizedFormattingContext =
  createContext<LocalizedFormatting | null>(null);

export const LocaleContext = createContext<string | undefined>(undefined);

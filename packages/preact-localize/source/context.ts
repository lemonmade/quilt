import {createOptionalContext} from '@quilted/preact-context';
import type {LocalizedFormatting} from '@quilted/localize';

export const LocalizedFormattingContext =
  createOptionalContext<LocalizedFormatting>();

export const LocaleContext = createOptionalContext<string>();

export {createLocalizedFormatting} from './formatting';
export type {
  LocalizedFormatting,
  LocalizedFormattingCache,
  LocalizedDateTimeFormatOptions,
  LocalizedNumberFormatOptions,
} from './formatting';
export {parseAcceptLanguageHeader} from './request-header';

export interface Translate {
  (): string;
}

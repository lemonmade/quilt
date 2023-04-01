export {
  createLocalizedFormatting,
  parseAcceptLanguageHeader,
} from '@quilted/localize';
export type {
  LocalizedFormatting,
  LocalizedFormattingCache,
  LocalizedNumberFormatOptions,
  LocalizedDateTimeFormatOptions,
} from '@quilted/localize';

export {Localization} from './Localization.tsx';
export {useLocalizedFormatting} from './hooks/formatting.ts';
export {useLocale} from './hooks/locale.ts';
export {useLocaleFromEnvironment} from './hooks/locale-from-environment.ts';
export {LocalizedFormattingContext} from './context.ts';

export * from './routing.ts';

// export function useLocale(): string {}
// export function useTranslate(): Translate {}

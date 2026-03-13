import type {Localization} from '@quilted/localize';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * The localization context for your application. The `Localization` object
     * contains the active locale string and locale-aware formatting utilities
     * for numbers, dates, currencies, lists, and more.
     *
     */
    readonly localization?: Localization;
  }
}

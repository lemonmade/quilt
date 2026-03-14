export interface LocalizedNumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: string;
}

export interface LocalizedDateTimeFormatOptions
  extends Intl.DateTimeFormatOptions {
  locale?: string;
}

export interface LocalizedFormattingCache<Formatter, Options> {
  get(options?: Options): Formatter;
  delete(options?: Options): boolean;
  clear(): void;
}

export interface LocalizedFormatting {
  readonly numberFormatter: LocalizedFormattingCache<
    Intl.NumberFormat,
    LocalizedNumberFormatOptions
  >;
  readonly dateTimeFormatter: LocalizedFormattingCache<
    Intl.DateTimeFormat,
    LocalizedDateTimeFormatOptions
  >;
  formatNumber(
    number: number | bigint | string,
    options?: Omit<
      LocalizedNumberFormatOptions,
      'currencySign' | 'currencyDisplay'
    >,
  ): string;
  formatCurrency(
    amount: number | bigint | string,
    options: Omit<LocalizedNumberFormatOptions, 'currency' | 'style'> & {
      currency: string;
    },
  ): string;
  formatDate(date: Date, options?: LocalizedDateTimeFormatOptions): string;
}

function createLocalizedFormattingCache<Formatter, Options extends {}>(
  create: (options?: Options) => Formatter,
): LocalizedFormattingCache<Formatter, Options> {
  const cache = new Map<string, Formatter>();

  return {
    get(options) {
      const key = createKey(options);
      const cached = cache.get(key);
      if (cached) return cached;

      const formatter = create(options);
      cache.set(key, formatter);

      return formatter;
    },
    delete(options) {
      const key = createKey(options);
      return cache.delete(key);
    },
    clear() {
      cache.clear();
    },
  };
}

function createKey(options?: Record<string, any>) {
  if (options == null) return '';

  const sortedEntries = Object.entries(options).sort(([keyOne], [keyTwo]) =>
    keyOne.localeCompare(keyTwo),
  );

  return JSON.stringify(Object.fromEntries(sortedEntries));
}

const RTL_LOCALES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'ha',
  'he',
  'khw',
  'ks',
  'ps',
  'sd',
  'ur',
  'uz-AF',
  'yi',
]);

/**
 * Encapsulates the active locale for an application and provides
 * locale-aware formatting utilities for numbers, currencies, and dates.
 *
 * Create an instance with a BCP 47 locale tag. The `direction` property
 * is derived automatically from the locale.
 *
 * @example
 * const localization = new Localization('en-US');
 * localization.formatNumber(1234567.89); // "1,234,567.89"
 * localization.formatCurrency(9.99, {currency: 'USD'}); // "$9.99"
 * localization.formatDate(new Date('2024-01-15')); // "1/15/2024"
 */
export class Localization implements LocalizedFormatting {
  /**
   * The active BCP 47 locale tag (e.g. `'en-US'`, `'fr'`, `'ar'`).
   */
  readonly locale: string;

  /**
   * The text direction implied by the locale — `'ltr'` for most scripts,
   * `'rtl'` for Arabic, Hebrew, and other right-to-left languages.
   */
  readonly direction: 'ltr' | 'rtl';

  /**
   * A cache of `Intl.NumberFormat` instances keyed by format options,
   * used internally by `formatNumber` and `formatCurrency`.
   */
  readonly numberFormatter = createLocalizedFormattingCache<
    Intl.NumberFormat,
    LocalizedNumberFormatOptions
  >(
    ({locale: customLocale, ...options} = {}) =>
      new Intl.NumberFormat(customLocale ?? this.locale, options),
  );

  /**
   * A cache of `Intl.DateTimeFormat` instances keyed by format options,
   * used internally by `formatDate`.
   */
  readonly dateTimeFormatter = createLocalizedFormattingCache<
    Intl.DateTimeFormat,
    LocalizedDateTimeFormatOptions
  >(
    ({locale: customLocale, ...options} = {}) =>
      new Intl.DateTimeFormat(customLocale ?? this.locale, options),
  );

  constructor(locale: string) {
    this.locale = locale;
    this.direction = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  }

  /**
   * Formats a number using the active locale and optional `Intl.NumberFormat`
   * options. Pass `{locale}` in options to override the locale for this call.
   */
  formatNumber = ((number, options) => {
    // @ts-expect-error NumberFormat.format() should accept string
    return this.numberFormatter.get(options).format(number);
  }) satisfies LocalizedFormatting['formatNumber'];

  /**
   * Formats a monetary amount using the active locale. The `currency` option
   * (e.g. `'USD'`, `'EUR'`) is required.
   */
  formatCurrency = ((amount, options) => {
    return (
      this.numberFormatter
        .get({...options, style: 'currency'})
        // @ts-expect-error NumberFormat.format() should accept string
        .format(amount)
    );
  }) satisfies LocalizedFormatting['formatCurrency'];

  /**
   * Formats a `Date` using the active locale and optional `Intl.DateTimeFormat`
   * options. Pass `{locale}` in options to override the locale for this call.
   */
  formatDate = ((date, options) => {
    return this.dateTimeFormatter.get(options).format(date);
  }) satisfies LocalizedFormatting['formatDate'];
}

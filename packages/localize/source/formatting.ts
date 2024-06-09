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

export function createLocalizedFormatting(locale: string): LocalizedFormatting {
  const numberFormatter = createLocalizedFormattingCache<
    Intl.NumberFormat,
    LocalizedNumberFormatOptions
  >(
    ({locale: customLocale, ...options} = {}) =>
      new Intl.NumberFormat(customLocale ?? locale, options),
  );

  const dateTimeFormatter = createLocalizedFormattingCache<
    Intl.DateTimeFormat,
    LocalizedDateTimeFormatOptions
  >(
    ({locale: customLocale, ...options} = {}) =>
      new Intl.DateTimeFormat(customLocale ?? locale, options),
  );

  return {
    numberFormatter,
    dateTimeFormatter,
    formatNumber(number, options) {
      // @ts-expect-error NumberFormat.format() should accept string
      return numberFormatter.get(options).format(number);
    },
    formatCurrency(amount, options) {
      return (
        numberFormatter
          .get({...options, style: 'currency'})
          // @ts-expect-error NumberFormat.format() should accept string
          .format(amount)
      );
    },
    formatDate(date, options) {
      return dateTimeFormatter.get(options).format(date);
    },
  };
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

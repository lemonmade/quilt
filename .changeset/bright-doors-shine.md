---
'@quilted/localize': patch
---

Added `Localization.translate()` method and new translation features.

## `Localization.translate()`

The `Localization` class now accepts an optional `translations` dictionary in its constructor and exposes a `translate()` method:

```ts
const localization = new Localization('en', {
  translations: {
    hello: 'Hello {name}',
    pages: {
      home: {title: 'Welcome home'},
    },
    message: {
      one: 'One message',
      other: '{count} messages',
    },
  },
});

localization.translate('hello', {name: 'world'}); // "Hello world"
localization.translate('pages.home.title'); // "Welcome home"
localization.translate('message', {count: 5}); // "5 messages"
```

## New `scope` option

Prefix all keys with a namespace to avoid repeating common prefixes:

```ts
localization.translate('title', {scope: 'pages.home'}); // resolves "pages.home.title"
```

## New `default` option

Provide a fallback string instead of throwing on missing keys:

```ts
localization.translate('missing.key', {default: 'Fallback'}); // "Fallback"
localization.translate('missing.key', {default: 'Hello {name}', name: 'world'}); // "Hello world"
```

## New `ordinal` option

Use `Intl.PluralRules` ordinal type for positional formatting (1st, 2nd, 3rd, etc.):

```ts
const localization = new Localization('en', {
  translations: {
    place: {
      one: '{count}st',
      two: '{count}nd',
      few: '{count}rd',
      other: '{count}th',
    },
  },
});

localization.translate('place', {count: 1, ordinal: true}); // "1st"
localization.translate('place', {count: 2, ordinal: true}); // "2nd"
localization.translate('place', {count: 3, ordinal: true}); // "3rd"
localization.translate('place', {count: 4, ordinal: true}); // "4th"
```

## New `MissingTranslationsError`

A dedicated error class thrown when `translate()` is called on a `Localization` instance that was constructed without a `translations` dictionary.

## New `TranslateOptions` type

Exported typed interface for the options object accepted by `translate()`, with `scope`, `default`, `ordinal`, and `count` as reserved keys alongside arbitrary placeholder replacements.

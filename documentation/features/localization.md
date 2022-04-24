# Localization

“Localization” refers to the practice of customizing your app to support users speaking different languages, or in different places around the world. Localization is important because it gives more people access to your application.

## Translation

TODO

## Setting the locale

To localize your application, you need to tell Quilt what locale your application is using. This value will be used to determine the right translations to load, how to format values, and as the [`lang` attribute on the HTML document](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang).

The simplest way to set the locale is to provide a hardcoded value to Quilt’s `Localization` component. Like the HTML `lang` attribute, the `locale` prop should be a language tag in the format defined in [RFC 5646](https://datatracker.ietf.org/doc/html/rfc5646), like `en` for english, or `fr-CA` for french as spoken in Canada.

```tsx
import {Localization} from '@quilted/quilt';

export function App() {
  return (
    <Localization locale="fr-CA">
      <RestOfApp />
    </Localization>
  );
}
```

The browser sends a special header, [`Accept-Language`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language), that lets the server know what locale the user prefers. You can use the value of this header as the locale of your application by using the `useLocaleFromEnvironment` hook, and passing its result as the `Localization` component’s `locale`:

```tsx
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt';

export function App() {
  const locale = useLocaleFromEnvironment();

  return (
    <Localization locale={locale}>
      <RestOfApp />
    </Localization>
  );
}
```

You can use the `useLocale` hook to access the current locale elsewhere in your React application:

```tsx
import {Localization, useLocale} from '@quilted/quilt';

export function App() {
  return (
    <Localization locale="fr-CA">
      <RestOfApp />
    </Localization>
  );
}

function RestOfApp() {
  // `locale` will be `'fr-CA'` in this case.
  const locale = useLocale();
  return <p>It looks like your locale is: {locale}</p>;
}
```

### Localized routing

One strategy that is commonly used on the web is to provide different locales at different URLs. Quilt also provides a full [routing library](./routing.md), and gives you some handy utilities for common versions of this technique.

#### Path-based localized routing

In path-based localization, the first part of the URL’s path is used to determine the locale of the application. For example, `/en/contact` and `/fr-ca/contact` would both be the same contact page, but in `en` and `fr-CA` locales, respectively.

To implement localized routing, you’ll use the `LocalizedRouter` component provided by Quilt. You will pass this component the information it needs to localize your app using the `createRoutePathLocalization` helper function, which takes in the information about what locales are supported in your app.

```tsx
import {
  useLocale,
  useRoutes,
  Localization,
  createRoutePathLocalization,
} from '@quilted/quilt';

const routeLocalization = createRoutePathLocalization({
  default: 'en',
  locales: ['en', 'fr', 'fr-CA'],
});

export function App() {
  return (
    <LocalizedRouter localization={routeLocalization}>
      <Routes />
    </LocalizedRouter>
  );
}

function Routes() {
  const locale = useLocale();

  return useRoutes([
    {match: '/', render: () => <div>{/* home page */}</div>},
    {
      match: 'contact',
      render: () => <div>{/* contact page */}</div>,
    },
  ]);
}
```

> **Note:** If you already have a `Router` component rendered in your application, make sure you replace it with this `LocalizedRouter` component — you don’t need both. You also don’t need to manually render the `Localization` component when using `LocalizedRouter`.

In the example above, `/en` and `/en/contact` would be rendered with an english locale, while `/fr`, `/fr/contact`, `/fr-ca`, and `/fr-ca/contact` would be rendered using french and french Canadian locales.

By default, the default locale is also included in the path, as shown above with the `/en` and `/en/contact` pages. If you would prefer to have the root locale be at the “root” of your app, you can pass the `{nested: false}` option alongside the default locale:

```tsx
import {
  useLocale,
  useRoutes,
  Localization,
  createRoutePathLocalization,
} from '@quilted/quilt';

const routeLocalization = createRoutePathLocalization({
  default: {locale: 'en', nested: false},
  locales: ['en', 'fr', 'fr-CA'],
});

export function App() {
  return (
    <LocalizedRouter localization={routeLocalization}>
      <Routes />
    </LocalizedRouter>
  );
}
```

In the example above, the english pages would now be available at `/` and `/contact`.

When using `LocalizedRouter`, the locale of your application will be set to the same value as the `useLocaleFromEnvironment` hook, as long as that locale is at least in the same language as the resolved route-based locale. In the examples above, if a user visited the app with an `en-CA` locale, that locale would be preserved, even though the route only matches the `en` language.

#### Subdomain-based localized routing

In subdomain-based localization, the part of the URL is used to determine the locale of the application. For example, `en.my-app.com` and `fr-ca.my-app.com` would both be the same contact page, but in `en` and `fr-CA` locales, respectively.

To implement localized routing, you’ll use the `LocalizedRouter` component provided by Quilt. You will pass this component the information it needs to localize your app using the `createRouteSubdomainLocalization` helper function, which takes in the information about what locales are supported in your app.

```tsx
import {
  useLocale,
  useRoutes,
  Localization,
  createRoutePathLocalization,
} from '@quilted/quilt';

const routeLocalization = createRoutePathLocalization({
  base: 'app.com',
  default: 'en',
  locales: ['en', 'fr'],
});

export function App() {
  return (
    <LocalizedRouter localization={routeLocalization}>
      <Routes />
    </LocalizedRouter>
  );
}

function Routes() {
  const locale = useLocale();

  return useRoutes([
    {match: '/', render: () => <div>{/* home page */}</div>},
    {
      match: 'contact',
      render: () => <div>{/* contact page */}</div>,
    },
  ]);
}
```

> **Note:** If you already have a `Router` component rendered in your application, make sure you replace it with this `LocalizedRouter` component — you don’t need both. You also don’t need to manually render the `Localization` component when using `LocalizedRouter`.

In the example above, `en.app.com` and `en.app.com/contact` would be rendered with an english locale, while `fr.app.com` and `fr.app.com/contact` would be rendered using a french locale.

By default, the default locale is also included in the subdomain, as shown above with the `en.app.com` subdomain. If you would prefer to have the root locale be at the “root” of your app, you can pass the `{nested: false}` option alongside the default locale:

```tsx
import {
  useLocale,
  useRoutes,
  Localization,
  createRoutePathLocalization,
} from '@quilted/quilt';

const routeLocalization = createRoutePathLocalization({
  base: 'app.com',
  default: {locale: 'en', nested: false},
  locales: ['en', 'fr', 'fr-CA'],
});

export function App() {
  return (
    <LocalizedRouter localization={routeLocalization}>
      <Routes />
    </LocalizedRouter>
  );
}
```

In the example above, the english pages would now be available at `app.com`.

When using `LocalizedRouter`, the locale of your application will be set to the same value as the `useLocaleFromEnvironment` hook, as long as that locale is at least in the same language as the resolved route-based locale. In the examples above, if a user visited the app with an `en-CA` locale, that locale would be preserved, even though the route only matches the `en` language.

#### Locale-based redirecting

TODO

## Localized formatting

Quilt provides a `useLocalizedFormatting` hook that gives you access to functions capable of localizing values according to the app’s locale. This hook provides access to three functions, each useful for formatting a different kind of value for the user:

- `formatNumber()` formats a number. You can pass this function any option you can pass to [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is used under the hood.
- `formatCurrency()` formats a number as a currency value. You can also pass this function any option you can pass to [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).
- `formatDate()` formats a `Date` object. You can pass this function any option you can pass to [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), which is used under the hood.

```tsx
import {Localization, useLocalizedFormatting} from '@quilted/quilt';

export function App() {
  return (
    <Localization locale="en-CA">
      <RestOfApp />
    </Localization>
  );
}

const purchase = {
  date: new Date(),
  quantity: 2,
  cost: 30,
};

function RestOfApp() {
  const {formatNumber, formatCurrency, formatDate} = useLocalizedFormatting();

  return (
    <dl>
      <dt>Purchased on</dt>
      <dd>{formatDate(purchase.date, {dateStyle: 'short'})}</dd>

      <dt>Quantity</dt>
      <dd>{formatNumber(purchase.quantity)}</dd>

      <dt>Cost</dt>
      <dd>{formatCurrency(purchase.cost, {currency: 'CAD'})}</dd>
    </dl>
  );
}
```

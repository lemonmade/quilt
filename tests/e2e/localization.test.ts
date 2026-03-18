import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer} from './utilities.ts';

describe('localization', () => {
  describe('locale', () => {
    it('can change locale mid-render', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useMemo} from 'preact/hooks';
          import {useRoutes} from '@quilted/quilt/navigation';
          import {useLocale, Localization} from '@quilted/quilt/localize';
          import {QuiltFrameworkContext} from '@quilted/quilt/context';

          export function Routes() {
            return useRoutes([{
              match: /\\w+(-\\w+)?/i, render: (_, {matched}) => (
                <LocaleProvider locale={matched[0]}><Localized /></LocaleProvider>
              ),
            }]);
          }

          function LocaleProvider({locale, children}) {
            const localization = useMemo(
              () => new Localization(locale),
              [locale],
            );
            return <QuiltFrameworkContext localization={localization}>{children}</QuiltFrameworkContext>;
          }

          function Localized() {
            const locale = useLocale();

            return (
              <div>Locale: {locale}</div>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/fr-CA');

      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });

    it('can read the preferred locale from the request', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useLocale} from '@quilted/quilt/localize';

          export function Routes() {
            return <Localized />;
          }

          function Localized() {
            const locale = useLocale();

            return (
              <div>Locale: {locale}</div>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        locale: 'fr-CA',
      });

      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });

    it('can localize by route', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {useMemo} from 'preact/hooks';
          import {useLocale, createRoutePathLocalization, LocalizedNavigation, Localization} from '@quilted/quilt/localize';
          import {QuiltFrameworkContext} from '@quilted/quilt/context';
          import {useBrowserDetails} from '@quilted/quilt/browser';

          const routeLocalization = createRoutePathLocalization({
            default: 'en',
            locales: ['en', 'fr'],
          })

          export default function App() {
            const browser = useBrowserDetails({optional: true});
            const {navigation, localization} = useMemo(
              () => {
                const navigation = new LocalizedNavigation(browser?.request.url, {routes: routeLocalization});
                const localization = new Localization(navigation.locale);

                return {navigation, localization};
              },
              [],
            );

            return (
              <QuiltFrameworkContext navigation={navigation} localization={localization}>
                <UI />
              </QuiltFrameworkContext>
            );
          }

          function UI() {
            const locale = useLocale();

            return (
              <div>Locale: {locale}</div>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/fr', {
        locale: 'en',
      });

      expect(await page.textContent('body')).toBe('Locale: fr');
    });

    it('can localize by route while preserving a regional locale', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {useMemo} from 'preact/hooks';
          import {useLocale, createRoutePathLocalization, LocalizedNavigation, Localization} from '@quilted/quilt/localize';
          import {QuiltFrameworkContext} from '@quilted/quilt/context';
          import {useBrowserDetails} from '@quilted/quilt/browser';

          const routeLocalization = createRoutePathLocalization({
            default: 'en',
            locales: ['en', 'fr'],
          })

          export default function App() {
            const browser = useBrowserDetails({optional: true});
            const {navigation, localization} = useMemo(
              () => {
                const navigation = new LocalizedNavigation(browser?.request.url, {routes: routeLocalization});
                const routeLocale = navigation.locale;
                const browserLocale = browser?.locale.value;
                const locale = browserLocale?.toLowerCase().startsWith(routeLocale.toLowerCase())
                  ? browserLocale
                  : routeLocale;

                const localization = new Localization(locale);

                return {navigation, localization};
              },
              [],
            );

            return (
              <QuiltFrameworkContext navigation={navigation} localization={localization}>
                <UI />
              </QuiltFrameworkContext>
            );
          }

          function UI() {
            const locale = useLocale();

            return (
              <div>Locale: {locale}</div>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/fr', {
        locale: 'fr-CA',
      });

      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });
  });
});

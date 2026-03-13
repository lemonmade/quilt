import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer} from './utilities.ts';

describe('localization', () => {
  describe('locale', () => {
    it('can change locale mid-render', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useContext, useMemo} from 'preact/hooks';
          import {useRoutes} from '@quilted/quilt/navigation';
          import {useLocale, createLocalization} from '@quilted/quilt/localize';
          import {quiltContext} from '@quilted/quilt/context';

          export function Routes() {
            return useRoutes([{
              match: /\\w+(-\\w+)?/i, render: (_, {matched}) => (
                <LocaleProvider locale={matched[0]}><Localized /></LocaleProvider>
              ),
            }]);
          }

          function LocaleProvider({locale, children}) {
            const existing = useContext(quiltContext);
            const newContext = useMemo(
              () => ({...existing, localize: createLocalization(locale)}),
              [existing, locale],
            );
            return <quiltContext.Provider value={newContext}>{children}</quiltContext.Provider>;
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
          import {useLocale, createRoutePathLocalization, LocalizedNavigation} from '@quilted/quilt/localize';

          const localization = createRoutePathLocalization({
            default: 'en',
            locales: ['en', 'fr'],
          })

          export default function App() {
            return (
              <LocalizedNavigation localization={localization}>
                <UI />
              </LocalizedNavigation>
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
          import {useLocale, createRoutePathLocalization, LocalizedNavigation} from '@quilted/quilt/localize';

          import {Routes} from './foundation/Routes.tsx';

          const localization = createRoutePathLocalization({
            default: 'en',
            locales: ['en', 'fr'],
          })

          export default function App() {
            return (
              <LocalizedNavigation localization={localization}>
                <UI />
              </LocalizedNavigation>
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

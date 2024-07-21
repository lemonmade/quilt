import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('localization', () => {
  describe('locale', () => {
    it('applies a locale to the HTML document', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useRoutes} from '@quilted/quilt/navigation';
          import {useLocale, Localization} from '@quilted/quilt/localize';
          
          export function Routes() {
            return useRoutes([{
              match: /\\w+(-\\w+)?/i, render: (_, {matched}) => (
                <Localization locale={matched[0]}><Localized /></Localization>
              ),
            }]);
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

      expect(
        await page.evaluate(() =>
          document.documentElement.getAttribute('lang'),
        ),
      ).toBe('fr-CA');
      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });

    it('applies a direction to the HTML document', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useRoutes} from '@quilted/quilt/navigation';
          import {useLocale, Localization} from '@quilted/quilt/localize';
          
          export function Routes() {
            return useRoutes([{
              match: /\\w+(-\\w+)?/i, render: (_, {matched}) => (
                <Localization locale={matched[0]}><Localized /></Localization>
              ),
            }]);
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
      const [leftToRightPage, rightToLeftPage] = await Promise.all([
        server.openPage('/en'),
        server.openPage('/ar'),
      ]);

      expect(
        await leftToRightPage.evaluate(() =>
          document.documentElement.getAttribute('dir'),
        ),
      ).toBe('ltr');
      expect(
        await rightToLeftPage.evaluate(() =>
          document.documentElement.getAttribute('dir'),
        ),
      ).toBe('rtl');
    });

    it('can read the preferred locale from the request', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useLocale, useLocaleFromEnvironment, Localization} from '@quilted/quilt/localize';
          
          export function Routes() {
            const locale = useLocaleFromEnvironment();

            return <Localization locale={locale}><Localized /></Localization>;
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

      expect(
        await page.evaluate(() =>
          document.documentElement.getAttribute('lang'),
        ),
      ).toBe('fr-CA');
      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });

    it('can localize by route', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

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

      expect(
        await page.evaluate(() =>
          document.documentElement.getAttribute('lang'),
        ),
      ).toBe('fr');
      expect(await page.textContent('body')).toBe('Locale: fr');
    });

    it('can localize by route while preserving a regional locale', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

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

      expect(
        await page.evaluate(() =>
          document.documentElement.getAttribute('lang'),
        ),
      ).toBe('fr-CA');
      expect(await page.textContent('body')).toBe('Locale: fr-CA');
    });
  });
});

import {jest, describe, it, expect} from '@quilted/testing';
import {
  buildAppAndRunServer,
  openPageAndWaitForNavigation,
  buildAppAndOpenPage,
  stripIndent,
  withWorkspace,
} from './utilities.ts';

jest.setTimeout(20_000);

describe('localization', () => {
  describe('locale', () => {
    it('applies a locale to the HTML document', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes, useLocale, Localization, usePerformanceNavigation} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{
                match: /\\w+(-\\w+)?/i, render: ({matched}) => (
                  <Localization locale={matched}><Localized /></Localization>
                ),
              }]);
            }
            
            function Localized() {
              usePerformanceNavigation();

              const locale = useLocale();

              return (
                <div>Locale: {locale}</div>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/fr-CA',
        });

        expect(
          await page.evaluate(() =>
            document.documentElement.getAttribute('lang'),
          ),
        ).toBe('fr-CA');
        expect(await page.textContent('body')).toBe('Locale: fr-CA');
      });
    });

    it('applies a direction to the HTML document', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes, useLocale, Localization, usePerformanceNavigation} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{
                match: /\\w+(-\\w+)?/i, render: ({matched}) => (
                  <Localization locale={matched}><Localized /></Localization>
                ),
              }]);
            }
            
            function Localized() {
              usePerformanceNavigation();

              const locale = useLocale();

              return (
                <div>Locale: {locale}</div>
              );
            }
          `,
        });

        const {url} = await buildAppAndRunServer(workspace);

        const [leftToRightPage, rightToLeftPage] = await Promise.all([
          openPageAndWaitForNavigation(workspace, new URL('/en', url)),
          openPageAndWaitForNavigation(workspace, new URL('/ar', url)),
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
    });

    it('can read the preferred locale from the request', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useLocale, usePerformanceNavigation, useLocaleFromEnvironment, Localization} from '@quilted/quilt';
            
            export function Routes() {
              const locale = useLocaleFromEnvironment();

              return <Localization locale={locale}><Localized /></Localization>;
            }
            
            function Localized() {
              usePerformanceNavigation();

              const locale = useLocale();

              return (
                <div>Locale: {locale}</div>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
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

    it('can localize by route', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import {LocalizedRouting, createRoutePathLocalization} from '@quilted/quilt/localize';

            const localization = createRoutePathLocalization({
              default: 'en',
              locales: ['en', 'fr'],
            })
            
            export default function App() {
              return (
                <LocalizedRouting localization={localization}>
                  <UI />
                </LocalizedRouting>
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

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/fr',
          locale: 'en',
        });

        expect(
          await page.evaluate(() =>
            document.documentElement.getAttribute('lang'),
          ),
        ).toBe('fr');
        expect(await page.textContent('body')).toBe('Locale: fr');
      });
    });

    it('can localize by route while preserving a regional locale', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import {LocalizedRouting, createRoutePathLocalization} from '@quilted/quilt';

            import {Routes} from './foundation/Routes.tsx';

            const localization = createRoutePathLocalization({
              default: 'en',
              locales: ['en', 'fr'],
            })
            
            export default function App() {
              return (
                <LocalizedRouting localization={localization}>
                  <UI />
                </LocalizedRouting>
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

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/fr',
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
});

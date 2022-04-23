import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('localization', () => {
  describe('locale', () => {
    it('applies a locale to the HTML document', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes, useLocale, Localization} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{
                match: /\\w+(-\\w+)?/i, render: ({matched}) => (
                  <Localization locale={matched}><Localized /></Localization>
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

    it('can read the preferred locale from the request', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useLocale, useLocaleFromEnvironment, Localization} from '@quilted/quilt';
            
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
            import {AppContext, PerformanceContext, LocalizedRouter, createRoutePathLocalization} from '@quilted/quilt';

            import {Http} from './foundation/Http';
            import {Head} from './foundation/Head';
            import {Routes} from './foundation/Routes';

            const localization = createRoutePathLocalization({
              default: 'en',
              locales: ['en', 'fr'],
            })
            
            export default function App() {
              return (
                <AppContext>
                  <LocalizedRouter localization={localization}>
                    <PerformanceContext>
                      <Http />
                      <Head />
                      <Routes />
                    </PerformanceContext>
                  </LocalizedRouter>
                </AppContext>
              );
            }
          `,
        });

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useLocale} from '@quilted/quilt';
            
            export function Routes() {
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
            import {AppContext, PerformanceContext, LocalizedRouter, createRoutePathLocalization} from '@quilted/quilt';

            import {Http} from './foundation/Http';
            import {Head} from './foundation/Head';
            import {Routes} from './foundation/Routes';

            const localization = createRoutePathLocalization({
              default: 'en',
              locales: ['en', 'fr'],
            })
            
            export default function App() {
              return (
                <AppContext>
                  <LocalizedRouter localization={localization}>
                    <PerformanceContext>
                      <Http />
                      <Head />
                      <Routes />
                    </PerformanceContext>
                  </LocalizedRouter>
                </AppContext>
              );
            }
          `,
        });

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useLocale} from '@quilted/quilt';
            
            export function Routes() {
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

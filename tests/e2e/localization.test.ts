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
  });
});

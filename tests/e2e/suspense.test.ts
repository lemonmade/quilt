import {jest, describe, it, expect} from '@quilted/testing';
import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('http', () => {
  describe('cookies', () => {
    it('renders the app on the server until Suspense boundaries have resolved', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
              let resolved;
              function useSuspenseValue() {
                if (resolved) return resolved;
                throw new Promise((resolve) => {
                  setTimeout(() => {
                    resolved = 'Hello suspense!';
                    resolve();
                  }, 0);
                });
              }
              
              export function Routes() {
                return <Start />;
              }
              
              function Start() {
                const value = useSuspenseValue();
                return <p>{value}</p>;
              }
            `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
        });

        expect(await page.textContent('body')).toMatch(`Hello suspense!`);
      });
    });
  });
});

import {jest, describe, it, expect} from '@quilted/testing';
import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities.ts';

jest.setTimeout(20_000);

describe('http', () => {
  describe('suspense', () => {
    it('renders the app on the server until Suspense boundaries have resolved', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
              import {Suspense} from 'react';
              import {usePerformanceNavigation} from '@quilted/quilt/performance';

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
                return (
                  <Suspense>
                    <Start />
                  </Suspense>
                );
              }
              
              function Start() {
                const value = useSuspenseValue();
                usePerformanceNavigation();
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

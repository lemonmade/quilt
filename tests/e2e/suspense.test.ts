import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer} from './utilities.ts';

describe('suspense', () => {
  it('renders the app on the server until Suspense boundaries have resolved', async () => {
    await using workspace = await Workspace.create({fixture: 'basic-app'});

    await workspace.fs.write({
      'foundation/Routes.tsx': multiline`
        import {Suspense} from 'preact/compat';

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
              <Home />
            </Suspense>
          );
        }
        
        function Home() {
          const value = useSuspenseValue();
          return <p>{value}</p>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(await page.textContent('body')).toMatch(`Hello suspense!`);
  });
});

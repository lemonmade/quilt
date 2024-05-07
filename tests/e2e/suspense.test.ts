import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('suspense', () => {
  it('renders the app on the server until Suspense boundaries have resolved', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

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
              <Start />
            </Suspense>
          );
        }
        
        function Start() {
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

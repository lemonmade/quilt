import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('html', () => {
  describe('head scripts', () => {
    it('includes the referenced scripts in the head', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {HeadScript} from '@quilted/quilt/html';

          export default function App() {
            return <HeadScript src="/script.js" />;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        javaScriptEnabled: false,
      });

      expect(await page.innerHTML('head')).toMatch(`<script src="/script.js">`);
    });
  });

  describe('head styles', () => {
    it('includes the referenced styles in the head', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {HeadStyle} from '@quilted/quilt/html';

          export default function App() {
            return <HeadStyle href="/style.css" />;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        javaScriptEnabled: false,
      });

      expect(await page.innerHTML('head')).toMatch(
        `<link rel="stylesheet" href="/style.css">`,
      );
    });
  });
});

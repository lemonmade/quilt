import {jest, describe, it, expect} from '@quilted/testing';
import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities.ts';

jest.setTimeout(20_000);

describe('html', () => {
  describe('head scripts', () => {
    it('includes the referenced scripts in the head', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import {HeadScript} from '@quilted/quilt/html';

            export default function App() {
              return <HeadScript src="/script.js" />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
          javaScriptEnabled: false,
        });

        expect(await page.innerHTML('head')).toMatch(
          `<script src="/script.js">`,
        );
      });
    });
  });

  describe('head styles', () => {
    it('includes the referenced styles in the head', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import {HeadStyle} from '@quilted/quilt/html';

            export default function App() {
              return <HeadStyle href="/style.css" />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
          javaScriptEnabled: false,
        });

        expect(await page.innerHTML('head')).toMatch(
          `<link rel="stylesheet" href="/style.css">`,
        );
      });
    });
  });
});

import {jest, describe, it, expect} from '@quilted/testing';
import {stripIndent, withWorkspace} from './utilities.ts';

jest.setTimeout(20_000);

describe('app builds', () => {
  describe('static', () => {
    it('creates static HTML files for statically-defined routes', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'quilt.project.ts': stripIndent`
            import {createProject, quiltApp} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft.ts';
            
            export default createProject((project) => {
              project.use(quiltApp({static: true}));
              project.use(addInternalExportCondition());
            });
          `,
          'pages/One.tsx': stripIndent`
            export default function One() {
              return <div>Page one</div>;
            }
          `,
          'pages/Two.tsx': stripIndent`
            export default function Two() {
              return <div>Page two</div>;
            }
          `,
          'pages/Three.tsx': stripIndent`
            export default function Three() {
              return <div>Page three</div>;
            }
          `,
          'foundation/Routes.tsx': stripIndent`
            import {
              Link,
              useRoutes,
              createAsyncComponent,
            } from '@quilted/quilt';

            const PageOne = createAsyncComponent(() => import('../pages/One.tsx'));
            const PageTwo = createAsyncComponent(() => import('../pages/Two.tsx'));
            const PageThree = createAsyncComponent(() => import('../pages/Three.tsx'));

            export function Routes() {
              return useRoutes([
                {match: '/', render: <Start />},
                {match: 'one', render: <PageOne />},
                {match: 'two', render: <PageTwo />},
                {match: 'three', render: <PageThree />},
              ]);
            }

            function Start() {
              return (
                <ul>
                  <li><Link to="one">Page one</Link></li>
                  <li><Link to="two">Page two</Link></li>
                  <li><Link to="three">Page three</Link></li>
                </ul>
              );
            }
          `,
        });

        await command.quilt.build();

        const [indexPage, pageOne, pageTwo, pageThree] = await Promise.all([
          fs.read('build/public/index.html'),
          fs.read('build/public/one.html'),
          fs.read('build/public/two.html'),
          fs.read('build/public/three.html'),
        ]);

        expect(indexPage).toContain('<a href="/one">Page one</a>');

        expect(pageOne).toContain('Page one');
        expect(pageOne).toMatch(
          /<script\s+type="module"\s+src="[/]assets[/]One./,
        );

        expect(pageTwo).toContain('Page two');
        expect(pageTwo).toMatch(
          /<script\s+type="module"\s+src="[/]assets[/]Two./,
        );

        expect(pageThree).toContain('Page three');
        expect(pageThree).toMatch(
          /<script\s+type="module"\s+src="[/]assets[/]Three./,
        );
      });
    });
  });
});

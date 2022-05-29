import {jest, describe, it, expect} from '@quilted/testing';
import {stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('graphql', () => {
  describe('type generation', () => {
    it('generates types from a project’s GraphQL config file', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        await workspace.fs.write({
          'graphql.config.toml': stripIndent`
            schema = "schema.graphql"
            documents = "features/**/*.graphql"
          `,
          'schema.graphql': stripIndent`
            type Query {
              title: String!
            }

            schema {
              query: Query
            }
          `,
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import {Start} from '../features/Start';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
          `,
          'features/Start/index.tsx': stripIndent`
            import {useQuery} from '@quilted/quilt';
            import startQuery from './StartQuery.graphql';

            export function Start() {
              const {data} = useQuery(startQuery);
              if (data == null) return null;

              const title: string = data.title;
              return <div>Title is: {title}</div>;
            }
          `,
          'features/Start/StartQuery.graphql': stripIndent`
            query Start {
              title
            }
          `,
        });

        const typeCheck = workspace.command.quilt.typeCheck();
        const result = await typeCheck;

        expect(typeCheck.child.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Quilt\.GraphQL\.TypeScriptDefinitions/);
      });
    });

    it('generates types for for each GraphQL project in a workspace', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        await workspace.fs.write({
          'graphql.config.ts': stripIndent`
            export default {
              projects: {
                default: {
                  schema: 'schema.graphql',
                  documents: 'features/Start/**/*.graphql',
                },
                admin: {
                  schema: 'schema.admin.graphql',
                  documents: 'features/Admin/**/*.graphql',
                },
              },
            }
          `,
          'schema.graphql': stripIndent`
            type Query {
              title: String!
            }

            schema {
              query: Query
            }
          `,
          'schema.admin.graphql': stripIndent`
            type Query {
              secret: Boolean!
            }

            schema {
              query: Query
            }
          `,
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import {Start} from '../features/Start';
            import {Admin} from '../features/Admin';
            
            export function Routes() {
              return useRoutes([
                {match: '/', render: () => <Start />},
                {match: '/admin', render: () => <Admin />},
              ]);
            }
          `,
          'features/Start/index.tsx': stripIndent`
            import {useQuery} from '@quilted/quilt';
            import startQuery from './StartQuery.graphql';

            export function Start() {
              const {data} = useQuery(startQuery);
              if (data == null) return null;

              const title: string = data.title;
              return <div>Title is: {title}</div>;
            }
          `,
          'features/Start/StartQuery.graphql': stripIndent`
            query Start {
              title
            }
          `,
          'features/Admin/index.tsx': stripIndent`
            import {useQuery} from '@quilted/quilt';
            import adminQuery from './AdminQuery.graphql';

            export function Admin() {
              const {data} = useQuery(adminQuery);
              if (data == null) return null;

              const title: boolean = data.secret;
              return <div>{secret && 'It’s a secret!'}</div>;
            }
          `,
          'features/Admin/AdminQuery.graphql': stripIndent`
            query Admin {
              secret
            }
          `,
        });

        const typeCheck = workspace.command.quilt.typeCheck();
        const result = await typeCheck;

        expect(typeCheck.child.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Quilt\.GraphQL\.TypeScriptDefinitions/);
      });
    });
  });
});

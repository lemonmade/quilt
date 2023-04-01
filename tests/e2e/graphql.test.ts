import {jest, describe, it, expect} from '@quilted/testing';
import {stripIndent, withWorkspace} from './utilities.ts';

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
            import {Start} from '../features/Start.tsx';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
          `,
          'features/Start/index.tsx': stripIndent`
            import type {StartQueryData} from './StartQuery.graphql';

            export function Start({data}: {data?: StartQueryData}) {
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

        const typeCheck = await workspace.command.quilt.typeCheck();

        expect(typeCheck.child.exitCode).toBe(0);
        expect(typeCheck.stdout).toMatch(
          /Quilt\.GraphQL\.TypeScriptDefinitions/,
        );
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
            import {Start} from '../features/Start.tsx';
            import {Admin} from '../features/Admin.tsx';
            
            export function Routes() {
              return useRoutes([
                {match: '/', render: () => <Start />},
                {match: '/admin', render: () => <Admin />},
              ]);
            }
          `,
          'features/Start/index.tsx': stripIndent`
            import type {StartQueryData} from './StartQuery.graphql';

            export function Start({data}: {data?: StartQueryData}) {
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
            import type {AdminQueryData} from './AdminQuery.graphql';

            export function Admin({data}: {data?: AdminQueryData}) {
              if (data == null) return null;

              const secret: boolean = data.secret;
              return <div>{secret && 'It’s a secret!'}</div>;
            }
          `,
          'features/Admin/AdminQuery.graphql': stripIndent`
            query Admin {
              secret
            }
          `,
        });

        const typeCheck = await workspace.command.quilt.typeCheck();

        expect(typeCheck.child.exitCode).toBe(0);
        expect(typeCheck.stdout).toMatch(
          /Quilt\.GraphQL\.TypeScriptDefinitions/,
        );
      });
    });
  });
});

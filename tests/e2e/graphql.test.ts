import {stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('graphql', () => {
  describe('type generation', () => {
    it('generates types from a project’s GraphQL config file', async () => {
      await withWorkspace(async (workspace) => {
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

        const result = await workspace.command.sewingKit.typeCheck();

        console.log(result);
        expect(result).toBeTruthy();
      });
    });
  });
});

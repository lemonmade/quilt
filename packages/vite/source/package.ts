import type {Plugin} from 'vite';
import type {} from 'vitest';

export interface PackageBaseOptions {
  /**
   * The root directory containing your package.
   */
  root?: string | URL;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;
}

export async function quiltPackage({
  graphql: useGraphQL = true,
}: PackageBaseOptions = {}) {
  const [{graphql}] = await Promise.all([
    import('@quilted/rollup/features/graphql'),
  ]);

  const plugins: Plugin[] = [];

  if (useGraphQL) {
    plugins.push(graphql());
  }

  plugins.push({
    name: '@quilted/overrides',
    config() {
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'preact',
        },
        resolve: {
          conditions: ['quilt:source'],
          alias: [
            {find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react/jsx-dev-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react', replacement: 'preact/compat'},
            {find: 'react-dom', replacement: 'preact/compat'},
            {
              find: /^@quilted[/]react-testing$/,
              replacement: '@quilted/react-testing/preact',
            },
          ],
        },
      };
    },
  });

  return plugins;
}

import type {Plugin} from 'vite';

export interface AppBaseOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this app. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should just be
   * for the main `App` component in your project, which Quilt will automatically use
   * to create browser and server-side entries for your project.
   *
   * If you only want to use a custom entry module for the browser build, use the
   * `entry` option of the `quiltAppBrowser()` instead. If you only want to use a
   * custom entry module for the server-side build, use the `server.entry` option
   * instead.
   *
   * @example './App.tsx'
   */
  app?: string;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;
}

export async function quiltApp({
  graphql: useGraphQL = true,
}: AppBaseOptions = {}) {
  const [{default: prefresh}, {graphql}] = await Promise.all([
    // @ts-expect-error This package is not set up correctly for ESM projects
    // @see https://github.com/preactjs/prefresh/issues/518
    import('@prefresh/vite'),
    import('@quilted/rollup/features/graphql'),
  ]);

  const plugins: Plugin[] = [prefresh()];

  if (useGraphQL) {
    // @ts-expect-error different versions of rollup
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

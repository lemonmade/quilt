import type {Plugin} from 'vite';

export function preactAliases() {
  return {
    name: '@quilted/preact-aliases',
    config() {
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'preact',
        },
        optimizeDeps: {
          // The default app templates don’t import Preact, but it is used as an alias
          // for React. Without explicitly listing it here, two different versions would
          // be created — one inlined into the React optimized dependency, and one as the
          // raw preact node module.
          include: ['preact'],
        },
        resolve: {
          dedupe: ['preact'],
          alias: [
            {find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react/jsx-dev-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react', replacement: 'preact/compat'},
            {find: 'react-dom', replacement: 'preact/compat'},
            {
              find: /^@quilted[/]react-testing$/,
              replacement: '@quilted/react-testing/preact',
            },
            {
              find: /^@quilted[/]react-testing[/]dom$/,
              replacement: '@quilted/react-testing/preact',
            },
          ],
        },
      };
    },
  } satisfies Plugin;
}

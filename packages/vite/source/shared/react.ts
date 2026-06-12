import type {Plugin} from 'vite';

export function react({
  package: reactPackage = 'preact',
}: {
  package?: 'react' | 'preact';
}): Plugin {
  if (reactPackage === 'react') {
    return {
      name: '@quilted/react',
      config() {
        return {
          // `esbuild` covers Vite 5–7; `oxc` covers Vite 8, where the esbuild
          // option is ignored whenever anything (e.g. Vitest) also sets `oxc`.
          esbuild: {
            jsx: 'automatic',
          },
          oxc: {
            jsx: {runtime: 'automatic'},
          },
        };
      },
    };
  }

  return {
    name: '@quilted/react',
    config() {
      return {
        // `esbuild` covers Vite 5–7; `oxc` covers Vite 8, where the esbuild
        // option is ignored whenever anything (e.g. Vitest) also sets `oxc`.
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'preact',
        },
        oxc: {
          jsx: {runtime: 'automatic', importSource: 'preact'},
        },
        optimizeDeps: {
          // The default app templates don’t import Preact, but it is used as an alias
          // for React. Without explicitly listing it here, two different versions would
          // be created — one inlined into the React optimized dependency, and one as the
          // raw preact node module.
          include: [
            'preact',
            'preact/compat',
            'preact/jsx-runtime',
            'preact/jsx-dev-runtime',
            'preact/hooks',
            'preact/debug',
            'preact/devtools',
          ],
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
  };
}

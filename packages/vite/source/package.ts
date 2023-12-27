import type {Plugin} from 'vite';

import {react} from './shared/react.ts';
import {monorepoPackageAliases} from './shared/node.ts';
import {tsconfigAliases} from './shared/typescript.ts';

export interface PackageBaseOptions {
  /**
   * The root directory containing your package.
   */
  root?: string | URL;

  /**
   * Controls how React will be handled by your package. Setting this value
   * to `preact` will cause Quilt to use `preact` as the JSX import source.
   * Otherwise, `react` will be used as the import source.
   *
   * @default true
   */
  react?: boolean | 'react' | 'preact';

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;
}

export async function quiltPackage({
  react: useReact = true,
  graphql: useGraphQL = true,
}: PackageBaseOptions = {}) {
  const [{graphql}] = await Promise.all([
    import('@quilted/rollup/features/graphql'),
  ]);

  const plugins: Plugin[] = [tsconfigAliases(), monorepoPackageAliases()];

  if (useReact) {
    plugins.push(
      react({package: typeof useReact === 'string' ? useReact : 'preact'}),
    );
  }

  if (useGraphQL) {
    plugins.push(graphql());
  }

  return plugins;
}

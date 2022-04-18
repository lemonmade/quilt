import {createProjectPlugin} from '@quilted/craft/kit';
import type {App, Service} from '@quilted/craft/kit';
import {addRollupNodeBundleInclusion} from '@quilted/craft/rollup';

/**
 * Configures this project to performantly load react-query in all environments.
 */
export function reactQuery() {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.ReactQuery',
    build({configure}) {
      configure(({rollupNodeBundle}) => {
        // We need react-query to be internalized because it is a commonjs dependency
        rollupNodeBundle?.((bundle) =>
          addRollupNodeBundleInclusion(/react-query/, bundle),
        );
      });
    },
    develop({configure}) {
      configure(({rollupNodeBundle}) => {
        // We need react-query to be internalized because it is a commonjs dependency
        rollupNodeBundle?.((bundle) =>
          addRollupNodeBundleInclusion(/react-query/, bundle),
        );
      });
    },
  });
}

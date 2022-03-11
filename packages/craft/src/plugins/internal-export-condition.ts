import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  ResolvedHooks,
  DevelopAppConfigurationHooks,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

export function internalExportCondition() {
  return createProjectPlugin({
    name: 'Quilt.InternalExportCondition',
    develop({configure}) {
      configure(
        ({
          rollupNodeExportConditions,
          viteResolveExportConditions,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          viteResolveExportConditions?.((exportConditions) => [
            'quilt:internal',
            ...exportConditions,
          ]);

          rollupNodeExportConditions?.((exportConditions) => [
            'quilt:internal',
            ...exportConditions,
          ]);
        },
      );
    },
    build({configure}) {
      configure(({rollupNodeExportConditions}) => {
        rollupNodeExportConditions?.((exportConditions) => [
          'quilt:internal',
          ...exportConditions,
        ]);
      });
    },
  });
}

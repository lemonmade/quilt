import {createProjectPlugin} from '@quilted/craft';

export function addInternalExportCondition() {
  return createProjectPlugin({
    name: 'Quilt.E2E.AddInternalExportCondition',
    build({configure}) {
      configure(({rollupNodeExportConditions}) => {
        rollupNodeExportConditions?.((conditions) => [
          'quilt:internal',
          ...conditions,
        ]);
      });
    },
    develop({configure}) {
      configure(({rollupNodeExportConditions}) => {
        rollupNodeExportConditions?.((conditions) => [
          'quilt:internal',
          ...conditions,
        ]);
      });
    },
  });
}

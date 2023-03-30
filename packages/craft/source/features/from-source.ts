import {createProjectPlugin} from '../kit.ts';

import type {} from '../tools/babel.ts';
import type {} from '../tools/rollup.ts';

export const EXPORT_CONDITION = 'quilt:source';

/**
 * Adds configuration to various tools to prefer the `from-source` build
 * for Node.js dependencies.
 */
export function fromSource() {
  return createProjectPlugin({
    name: 'Quilt.FromSourceConsumer',
    develop({configure}) {
      if (!isFromSource()) return;

      configure(({viteResolveExportConditions, rollupNodeExportConditions}) => {
        // Prefer the esnext export condition
        rollupNodeExportConditions?.((exportConditions) =>
          Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
        );

        viteResolveExportConditions?.((exportConditions) =>
          Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
        );
      });
    },
    build({configure}) {
      if (!isFromSource()) return;

      configure(({rollupNodeExportConditions}) => {
        rollupNodeExportConditions?.((exportConditions) =>
          Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
        );
      });
    },
  });
}

function isFromSource() {
  return Boolean(process.env.QUILT_FROM_SOURCE);
}

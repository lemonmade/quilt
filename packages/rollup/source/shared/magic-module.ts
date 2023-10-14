import type {Plugin, PluginContext} from 'rollup';

import {MAGIC_MODULE_ENTRY} from '../constants.ts';

const VIRTUAL_MODULE_PREFIX = '\0';
const VIRTUAL_MODULE_POSTFIX = '/module.js';

export function createMagicModulePlugin({
  name,
  module,
  alias = `${VIRTUAL_MODULE_PREFIX}${module}${VIRTUAL_MODULE_POSTFIX}`,
  source: getSource,
  sideEffects = false,
}: {
  readonly name: string;
  readonly alias?: string;
  readonly module: string;
  readonly sideEffects?: boolean;
  source?(this: PluginContext): string | Promise<string>;
}) {
  return {
    name,
    resolveId(id) {
      if (id !== module) return null;

      return {
        id: alias,
        moduleSideEffects: sideEffects ? 'no-treeshake' : undefined,
      };
    },
    load: getSource
      ? async function load(source) {
          if (source !== alias) return null;

          const code = await getSource.call(this);

          return {
            code,
            moduleSideEffects: sideEffects ? 'no-treeshake' : undefined,
          };
        }
      : undefined,
  } satisfies Plugin;
}

export function createMagicModuleEntryPlugin({
  module = MAGIC_MODULE_ENTRY,
  ...options
}: Omit<Parameters<typeof createMagicModulePlugin>[0], 'module' | 'alias'> & {
  module?: string;
}) {
  return createMagicModulePlugin({...options, module});
}

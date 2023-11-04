import type {Plugin} from 'vite';
import type {PluginContext} from 'rollup';

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
    enforce: 'pre',
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

          // @ts-expect-error Vite depends on an older Rollup
          const code = await getSource.call(this);

          return {
            code,
            moduleSideEffects: sideEffects ? 'no-treeshake' : undefined,
          };
        }
      : undefined,
  } satisfies Plugin;
}

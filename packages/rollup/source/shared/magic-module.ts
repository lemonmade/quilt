import type {Plugin, PluginContext} from 'rollup';

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
  readonly alias?: string | (() => string | Promise<string>);
  readonly module: string;
  readonly sideEffects?: boolean;
  source?(this: PluginContext): string | Promise<string>;
}) {
  return {
    name,
    async resolveId(id) {
      if (id !== module) return null;

      const resolved = typeof alias === 'function' ? await alias() : alias;

      return {
        id: resolved,
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

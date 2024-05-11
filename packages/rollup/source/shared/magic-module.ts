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
  readonly module: string | string[];
  readonly sideEffects?: boolean;
  source?(this: PluginContext): string | Promise<string>;
}) {
  const virtualModuleAlias = `${VIRTUAL_MODULE_PREFIX}${module}${VIRTUAL_MODULE_POSTFIX}`;

  return {
    name,
    async resolveId(id) {
      if (
        id !== module ||
        (Array.isArray(module) && module.some((moduleID) => moduleID === id))
      ) {
        return null;
      }

      const resolved =
        (typeof alias === 'function' ? await alias() : alias) ??
        virtualModuleAlias;

      return {
        id: resolved,
        moduleSideEffects: sideEffects ? 'no-treeshake' : undefined,
      };
    },
    load: getSource
      ? async function load(source) {
          if (source !== virtualModuleAlias) return null;

          const code = await getSource.call(this);

          return {
            code,
            moduleSideEffects: sideEffects ? 'no-treeshake' : undefined,
          };
        }
      : undefined,
  } satisfies Plugin;
}

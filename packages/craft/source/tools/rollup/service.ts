import type {Plugin, PluginContext} from 'rollup';

import {MAGIC_MODULE_ENV} from '../../constants.ts';

import {type MagicModulesOptions} from './module.ts';

import {createEnvMagicModule} from './shared/env.ts';

export interface ServiceMagicModulesOptions extends MagicModulesOptions {}

interface MagicModule {
  readonly sideEffects: boolean;
  source(this: PluginContext): Promise<string>;
}

const VIRTUAL_MODULE_PREFIX = '\0';
const VIRTUAL_MODULE_POSTFIX = '/module.js';

export function serviceMagicModules({
  mode = 'production',
  env = true,
}: ServiceMagicModulesOptions) {
  const magicModules = new Map<string, MagicModule>();

  if (env !== false) {
    magicModules.set(MAGIC_MODULE_ENV, {
      sideEffects: false,
      async source() {
        const content = await createEnvMagicModule.call(this, {
          mode,
          ...(typeof env === 'boolean' ? {} : env),
        });

        return content;
      },
    });
  }

  return {
    name: '@quilted/service/magic-modules',
    resolveId(id) {
      const magicModule = magicModules.get(id);

      if (magicModule == null) return null;

      const virtualModuleID = `${VIRTUAL_MODULE_PREFIX}${id}${VIRTUAL_MODULE_POSTFIX}`;

      return {
        id: virtualModuleID,
        moduleSideEffects: magicModule.sideEffects ? 'no-treeshake' : undefined,
      };
    },
    async load(source) {
      if (
        !source.startsWith(VIRTUAL_MODULE_PREFIX) ||
        !source.endsWith(VIRTUAL_MODULE_POSTFIX)
      ) {
        return null;
      }

      const magicModule = magicModules.get(
        source.slice(
          VIRTUAL_MODULE_PREFIX.length,
          source.length - VIRTUAL_MODULE_POSTFIX.length,
        ),
      );

      if (magicModule == null) return null;

      const code = await magicModule.source.call(this);

      return {
        code,
        moduleSideEffects: magicModule.sideEffects ? 'no-treeshake' : undefined,
      };
    },
  } satisfies Plugin;
}

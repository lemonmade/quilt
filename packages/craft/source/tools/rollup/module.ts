import type {Plugin, PluginContext} from 'rollup';

import {MAGIC_MODULE_ENV} from '../../constants.ts';

import {
  createEnvMagicModule,
  type EnvMagicModuleOptions,
} from './shared/env.ts';

export interface MagicModulesOptions {
  /**
   * The runtime mode for your target environment.
   */
  mode?: 'production' | 'development';

  /**
   * Configuration for the magic environment module, `quilt:magic/env`. You
   * can set this option to an object which controls the contents of the environment
   * module, or `false` to disable the module entirely. If you do not provide
   * this option, it is defaulted to `true`, which will create a default environment
   * module based on your environment.
   *
   * @default true
   */
  env?: boolean | EnvMagicModuleOptions;
}

interface MagicModule {
  readonly sideEffects: boolean;
  source(this: PluginContext): Promise<string>;
}

const VIRTUAL_MODULE_PREFIX = '\0';
const VIRTUAL_MODULE_POSTFIX = '/module.js';

export function magicModules({
  mode = 'production',
  env = true,
}: MagicModulesOptions) {
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
    name: '@quilted/magic-modules',
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

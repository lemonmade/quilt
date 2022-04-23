import {createProjectPlugin} from '../kit';
import type {App, WaterfallHook} from '../kit';

export interface Hooks {
  /**
   * The content to use for the automatic application server. This
   * hook runs with the explicit content from the `server.entry` option,
   * or the default app server if that option is not set.
   */
  quiltAppServerEntryContent: WaterfallHook<string>;

  /**
   * The port to run the automatic server on, if you use the default
   * Node server build (that is, you do not add any plugins that adapt
   * the server to a different environment, and you do not specify a
   * custom server with the `server.entry` option). This result is passed
   * to the `quiltHttpHandlerPort`, which may customize it further, before
   * falling back to the `PORT` environment if no explicit value is set.
   */
  quiltAppServerPort: WaterfallHook<number | undefined>;

  /**
   * The host to run the automatic server on, if you use the default
   * Node server build (that is, you do not add any plugins that adapt
   * the server to a different environment, and you do not specify a
   * custom server with the `server.entry` option). This result is passed
   * to the `quiltHttpHandlerHost`, which may customize it further.
   */
  quiltAppServerHost: WaterfallHook<string | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends Hooks {}
  interface DevelopAppConfigurationHooks extends Hooks {}
}

export const NAME = 'Quilt.MagicModule.AppServerEntry';

export function magicModuleAppServerEntry() {
  return createProjectPlugin<App>({
    name: NAME,
    build({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltAppServerHost: waterfall(),
        quiltAppServerPort: waterfall(),
        quiltAppServerEntryContent: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltAppServerHost: waterfall(),
        quiltAppServerPort: waterfall(),
        quiltAppServerEntryContent: waterfall(),
      }));
    },
  });
}
import {
  WebApp,
  Target,
  createProjectPlugin,
  Task,
  addHooks,
  // WaterfallHook,
  Service,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
} from '@sewing-kit/hooks';

interface CustomHooks {
  // readonly quiltBrowserEntryContent: WaterfallHook<string>;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}

  interface BuildServiceConfigurationCustomHooks extends CustomHooks {}
  interface DevServiceConfigurationCustomHooks extends CustomHooks {}
}

interface IncludeDetails {
  readonly task: Task;
  readonly target?: Target<WebApp | Service, BuildWebAppTargetOptions>;
}

interface CssOptions {
  readonly hydrate?: boolean | ((details: IncludeDetails) => boolean);
  include?(details: IncludeDetails): boolean;
}

export function css({include = () => true}: CssOptions = {}) {
  return createProjectPlugin<WebApp | Service>('Quilt.Css', ({tasks}) => {
    function addConfiguration() {
      return ({
        rollupPlugins,
        postcssPlugins,
      }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) => {
        rollupPlugins?.hook(async (plugins) => {
          const [
            {default: styles},
            configuredPostcssPlugins,
          ] = await Promise.all([
            import('rollup-plugin-styles'),
            postcssPlugins!.run({}),
          ]);

          const interopRequire = (pkg: string) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const required = require(pkg);
            return required?.default ?? required;
          };

          const resolvedPostcssPlugins = Object.entries(
            configuredPostcssPlugins,
          ).map(([pluginPackage, options]) => {
            return interopRequire(pluginPackage)(
              typeof options === 'boolean' ? undefined : options,
            );
          });

          return [
            ...plugins,
            styles({
              config: false,
              mode: 'emit',
              plugins: resolvedPostcssPlugins,
            }),
          ];
        });
      };
    }

    const addSourceHooks = addHooks<CustomHooks>(() => ({
      // quiltBrowserEntryContent: new WaterfallHook(),
    }));

    tasks.build.hook(({hooks}) => {
      hooks.configureHooks.hook(addSourceHooks);

      hooks.target.hook(({target, hooks}) => {
        if (target.options.quiltAutoServer) return;
        if (!include({target, task: Task.Build})) return;

        hooks.configure.hook(addConfiguration());
      });
    });

    // eslint-disable-next-line no-warning-comments
    // TODO: dev needs targets too!
    tasks.dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addSourceHooks);

      if (!include({task: Task.Dev})) return;

      hooks.configure.hook(addConfiguration());
    });
  });
}

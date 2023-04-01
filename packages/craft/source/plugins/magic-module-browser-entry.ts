import {
  createProjectPlugin,
  type WaterfallHook,
  type WaterfallHookWithDefault,
} from '../kit.ts';

export interface Options {
  hydrate: boolean;
}

export interface Hooks {
  /**
   * If the default Quilt entry is used (that is, the developer did not provide
   * a `browser.entryModule` for the application), this hook is used to determine
   * whether the default entry should use hydration or rendering. Defaults to
   * hydrating if a server is built for this application, and false otherwise.
   */
  quiltAppBrowserEntryShouldHydrate: WaterfallHookWithDefault<boolean>;

  /**
   * If the default Quilt entry is used (that is, the developer did not provide
   * a `browser.entryModule` for the application), this hook is used the CSS
   * selector that your application should be rendered into. Quilt will pass
   * this value to `document.querySelector` and render into the resulting
   * node. Defaults to `#app` (an element with `id="app"`), which is used by
   * the auto-generated Quilt server.
   */
  quiltAppBrowserEntryCssSelector: WaterfallHookWithDefault<string>;

  /**
   * This hook lets you completely customize the browser entry content for the
   * application. In general, you should instead use the `browser.initializeModule`
   * option instead if you want to provide content that runs immediately when your
   * app boots, or the `browser.entryContent` option if you want to customize the
   * actual rendering code of the browser entry.
   */
  quiltAppBrowserEntryContent: WaterfallHook<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends Hooks {}
  interface DevelopProjectConfigurationHooks extends Hooks {}
}

export const NAME = 'Quilt.MagicModule.BrowserEntry';

export function magicModuleBrowserEntry({hydrate}: Options) {
  return createProjectPlugin({
    name: NAME,
    build({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltAppBrowserEntryContent: waterfall(),
        quiltAppBrowserEntryShouldHydrate: waterfall({
          default: hydrate,
        }),
        quiltAppBrowserEntryCssSelector: waterfall({
          default: '#app',
        }),
      }));
    },
    develop({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltAppBrowserEntryContent: waterfall(),
        quiltAppBrowserEntryShouldHydrate: waterfall({
          default: hydrate,
        }),
        quiltAppBrowserEntryCssSelector: waterfall({
          default: '#app',
        }),
      }));
    },
  });
}

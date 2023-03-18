import type {Config as BrowserslistConfig} from 'browserslist';

import {createProjectPlugin, DiagnosticError} from '../kit';
import type {Project, WaterfallHookWithDefault} from '../kit';

export interface Options {
  entry?: string;
  server: boolean;
  static: boolean;
}

export interface AppBuildBrowserTarget {
  name: string;
  browsers: string[];
}

export interface AppBaseConfigurationHooks {
  /**
   * The module that acts as the entrypoint for this app.
   */
  readonly quiltAppEntry: WaterfallHookWithDefault<string>;

  /**
   * The browser build targets for this application.
   */
  readonly quiltAppBrowserTargets: WaterfallHookWithDefault<
    AppBuildBrowserTarget[]
  >;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends AppBaseConfigurationHooks {}
  interface DevelopProjectConfigurationHooks
    extends AppBaseConfigurationHooks {}
}

export const BROWSERSLIST_MODULES_QUERY =
  'extends @quilted/browserslist-config/modules';

const DEFAULT_BROWSERSLIST_CONFIG: BrowserslistConfig = {
  defaults: ['extends @quilted/browserslist-config/defaults'],
  modules: [BROWSERSLIST_MODULES_QUERY],
  evergreen: ['extends @quilted/browserslist-config/evergreen'],
};

const DEFAULT_STATIC_BROWSERSLIST_CONFIG: BrowserslistConfig = {
  defaults: ['extends @quilted/browserslist-config/defaults'],
  modules: [BROWSERSLIST_MODULES_QUERY],
};

export function appBase({entry, ...options}: Options) {
  return createProjectPlugin({
    name: 'Quilt.AppBase',
    build({hooks, project}) {
      hooks<AppBaseConfigurationHooks>(({waterfall}) => ({
        quiltAppEntry: waterfall({
          default: () =>
            entry ? project.fs.resolvePath(entry) : getEntryForProject(project),
        }),
        quiltAppBrowserTargets: waterfall({
          default: () => getDefaultBrowserTargets(project, options),
        }),
      }));
    },
    develop({hooks, project}) {
      hooks<AppBaseConfigurationHooks>(({waterfall}) => ({
        quiltAppEntry: waterfall({
          default: () =>
            entry ? project.fs.resolvePath(entry) : getEntryForProject(project),
        }),
        quiltAppBrowserTargets: waterfall({
          default: () => getDefaultBrowserTargets(project, options),
        }),
      }));
    },
  });
}

async function getDefaultBrowserTargets(
  project: Project,
  {server, static: isStatic}: Pick<Options, 'server' | 'static'>,
) {
  const {default: browserslist} = await import('browserslist');

  const foundConfig =
    browserslist.findConfig(project.root) ??
    (isStatic && !server
      ? DEFAULT_STATIC_BROWSERSLIST_CONFIG
      : DEFAULT_BROWSERSLIST_CONFIG);

  const browserTargets: AppBuildBrowserTarget[] = [];

  for (const [name, query] of Object.entries(foundConfig)) {
    const normalizedName = name === 'defaults' ? 'default' : name;

    browserTargets.push({
      name: normalizedName,
      browsers: browserslist(query),
    });
  }

  // We assume that the smallest set of browser targets is the highest priority,
  // since that usually means that the bundle sizes will be smaller.
  return browserTargets.sort(
    ({browsers: browsersOne}, {browsers: browsersTwo}) => {
      return browsersOne.length - browsersTwo.length;
    },
  );
}

async function getEntryForProject(project: Project) {
  const main = project.packageJson?.raw.main;

  if (typeof main === 'string') return project.fs.resolvePath(main);

  const [entry] = await project.fs.glob('{index,app,App}.{ts,tsx,js,jsx}', {
    absolute: true,
  });

  if (entry == null) {
    throw new DiagnosticError({
      title: `Could not find entry for app ${project.name}`,
      suggestion: `Add the \`entry\` option to the \`quiltApp()\` call in its \`quilt.project.ts\` file. This option should point to a file that exports your main React component as the default export. Alternatively, you can set the path to this file as the "main" property in the app’s package.json file.`,
    });
  }

  return entry;
}

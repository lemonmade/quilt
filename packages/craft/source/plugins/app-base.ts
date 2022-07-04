import {createProjectPlugin, DiagnosticError} from '../kit';
import type {Project, WaterfallHookWithDefault} from '../kit';

export interface Options {
  entry?: string;
}

export interface AppBaseConfigurationHooks {
  /**
   * The module that acts as the entrypoint for this app.
   */
  readonly quiltAppEntry: WaterfallHookWithDefault<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends AppBaseConfigurationHooks {}
  interface DevelopProjectConfigurationHooks
    extends AppBaseConfigurationHooks {}
}

export function appBase({entry}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.AppBase',
    build({hooks, project}) {
      hooks<AppBaseConfigurationHooks>(({waterfall}) => ({
        quiltAppEntry: waterfall({
          default: () => entry ?? getEntryForProject(project),
        }),
      }));
    },
    develop({hooks, project}) {
      hooks<AppBaseConfigurationHooks>(({waterfall}) => ({
        quiltAppEntry: waterfall({
          default: () => entry ?? getEntryForProject(project),
        }),
      }));
    },
  });
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

import {createProjectPlugin, DiagnosticError} from '../kit';
import type {Project, WaterfallHookWithDefault} from '../kit';

export interface Options {
  entry?: string;
}

export interface ServiceBaseConfigurationHooks {
  /**
   * The module that acts as the entrypoint for this service.
   */
  readonly quiltServiceEntry: WaterfallHookWithDefault<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks
    extends ServiceBaseConfigurationHooks {}
  interface DevelopProjectConfigurationHooks
    extends ServiceBaseConfigurationHooks {}
}

export function serviceBase({entry}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.ServiceBase',
    build({hooks, configure, project}) {
      hooks<ServiceBaseConfigurationHooks>(({waterfall}) => ({
        quiltServiceEntry: waterfall({
          default: () => entry ?? getEntryForProject(project),
        }),
      }));

      configure(({runtimes}) => {
        runtimes(() => [{target: 'node'}]);
      });
    },
    develop({hooks, configure, project}) {
      hooks<ServiceBaseConfigurationHooks>(({waterfall}) => ({
        quiltServiceEntry: waterfall({
          default: () => entry ?? getEntryForProject(project),
        }),
      }));

      configure(({runtimes}) => {
        runtimes(() => [{target: 'node'}]);
      });
    },
  });
}

async function getEntryForProject(project: Project) {
  const main = project.packageJson?.raw.main;

  if (typeof main === 'string') return project.fs.resolvePath(main);

  const [entry] = await project.fs.glob('index.{ts,tsx,js,jsx}', {
    absolute: true,
  });

  if (entry == null) {
    throw new DiagnosticError({
      title: `Could not find entry for service ${project.name}`,
      suggestion: `Add the \`entry\` option to the \`quiltService()\` call in its \`quilt.project.ts\` file. This option should point to a file that runs your service. Alternatively, you can set the path to this file as the "main" property in the app’s package.json file.`,
    });
  }

  return entry;
}

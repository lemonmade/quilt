import {
  Runtime,
  DiagnosticError,
  createProjectPlugin,
} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';

export interface TargetHooks {
  /**
   * A browserslist query that represents the target environments
   * for this project.
   */
  targets: WaterfallHook<string[]>;

  /**
   * The environment section to use from the browserslist configuration
   * found for this project. This is used to determine the default set of
   * browser targets for your project if it runs in the browser. If you
   * only list one set of browsers in your browserslist configuration,
   * you can ignore this option — the default, `undefined`, works just fine
   * in that case. You only need to customize this option if you list
   * multiple browserlist queries in your configuration. For example,
   * you would need to customize this hook to provide either `default`
   * or `modern` if you had the following browserslist query in your
   * package.json:
   *
   * ```json
   * {
   *   "browserslist": {
   *     "default": ["defaults"],
   *     "modern": ["last 1 major version"]
   *   }
   * }
   * ```
   */
  targetName: WaterfallHook<string | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends TargetHooks {}
  interface DevelopProjectConfigurationHooks extends TargetHooks {}
  interface TestProjectConfigurationHooks extends TargetHooks {}
}

/**
 * Customizes Babel, PostCSS, and other build tools to target the
 * environment that is appropriate for a given project.
 */
export function targets() {
  return createProjectPlugin({
    name: 'SewingKit.Targets',
    build({hooks, configure, project, workspace}) {
      hooks<TargetHooks>(({waterfall}) => ({
        targets: waterfall(),
        targetName: waterfall(),
      }));

      configure(
        async ({targets, targetName, babelTargets, babelPresets}, {target}) => {
          const useNodeTarget = target.includes(Runtime.Node);
          const useBrowserTarget = target.includes(Runtime.Browser);

          const defaultTargets: string[] = [];

          if (useNodeTarget) {
            const engines: {node?: string} | undefined =
              (project.packageJson?.raw.engines as any) ??
              (workspace.packageJson?.raw.engines as any);

            const nodeSemver = engines?.node;

            // If no node engine is specified, we will use the current version of
            // node, which we assume you are setting as your minimum supported
            // target.
            if (nodeSemver == null) {
              defaultTargets.push('current node');
            } else {
              const {default: semver} = await import('semver');

              const parsed = semver.minVersion(nodeSemver);

              if (parsed == null) {
                throw new DiagnosticError({
                  title: `Could not parse engines.node in order to determine the node target for project ${
                    project.name
                  }: ${JSON.stringify(nodeSemver)}`,
                });
              }

              defaultTargets.push(`node ${parsed.major}.${parsed.minor}`);
            }
          }

          if (useBrowserTarget) {
            const [{default: browserslist}, env] = await Promise.all([
              import('browserslist'),
              targetName!.run(undefined),
            ]);

            defaultTargets.push(
              ...browserslist(undefined, {
                env,
                path: project.fs.root,
              }),
            );
          }

          babelTargets?.(() => targets!.run(defaultTargets));
          babelPresets?.((presets) => ['@babel/preset-env', ...presets]);
        },
      );
    },
    develop({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        targets: waterfall(),
        targetName: waterfall(),
      }));

      configure(({targets, babelTargets, babelPresets}) => {
        const defaultTargets = ['current node'];

        babelTargets?.(() => targets!.run(defaultTargets));
        babelPresets?.((presets) => ['@babel/preset-env', ...presets]);
      });
    },
    test({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        targets: waterfall(),
        targetName: waterfall(),
      }));

      configure(({targets, babelPresets, babelTargets}) => {
        const defaultTargets = ['current node'];

        babelTargets?.(() => targets!.run(defaultTargets));
        babelPresets?.((presets) => ['@babel/preset-env', ...presets]);
      });
    },
  });
}

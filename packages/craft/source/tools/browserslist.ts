import {
  DiagnosticError,
  createProjectPlugin,
  type WaterfallHook,
} from '../kit.ts';

export interface TargetHooks {
  /**
   * A browserslist query that represents the target environments
   * for this project.
   */
  browserslistTargets: WaterfallHook<string[]>;

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
  browserslistTargetName: WaterfallHook<string | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends TargetHooks {}
  interface DevelopProjectConfigurationHooks extends TargetHooks {}
  interface TestProjectConfigurationHooks extends TargetHooks {}
}

/**
 * Customizes the browserslist configuration for a project.
 */
export function browserslist() {
  return createProjectPlugin({
    name: 'quilt.browserslist',
    build({hooks, configure, project, workspace}) {
      hooks<TargetHooks>(({waterfall}) => ({
        browserslistTargets: waterfall(),
        browserslistTargetName: waterfall(),
      }));

      configure(({runtimes, browserslistTargets, browserslistTargetName}) => {
        browserslistTargets!(async (targets) => {
          if (targets.length > 0) return targets;

          const resolvedRuntimes = await runtimes!.run([]);

          const useNodeTarget =
            resolvedRuntimes.length === 0 ||
            resolvedRuntimes.some((runtime) => runtime.target === 'node');
          const useBrowserTarget =
            resolvedRuntimes.length === 0 ||
            resolvedRuntimes.some((runtime) => runtime.target === 'browser');

          if (useNodeTarget) {
            const engines: {node?: string} | undefined =
              (project.packageJson?.raw.engines as any) ??
              (workspace.packageJson?.raw.engines as any);

            const nodeSemver = engines?.node;

            // If no node engine is specified, we will use the current version of
            // node, which we assume you are setting as your minimum supported
            // target.
            if (nodeSemver == null) {
              targets.push('current node');
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

              targets.push(`node ${parsed.major}.${parsed.minor}`);
            }
          }

          if (useBrowserTarget) {
            const [{default: browserslist}, env] = await Promise.all([
              import('browserslist'),
              browserslistTargetName!.run(undefined),
            ]);

            const browserslistConfig = browserslist.findConfig(project.fs.root);

            const matchingConfiguration =
              browserslistConfig?.[env ?? 'defaults'];

            if (env != null && matchingConfiguration == null) {
              throw new DiagnosticError({
                title: `Could not find browserslist configuration for environment ${JSON.stringify(
                  env,
                )} in project ${JSON.stringify(project.name)}`,
              });
            }

            targets.push(...(matchingConfiguration ?? ['defaults']));
          }

          return targets;
        });
      });
    },
    develop({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        browserslistTargets: waterfall(),
        browserslistTargetName: waterfall(),
      }));

      configure(({runtimes, browserslistTargets}) => {
        browserslistTargets!(async (targets) => {
          if (targets.length > 0) return targets;

          const resolvedRuntimes = await runtimes!.run([]);

          const useNodeTarget =
            resolvedRuntimes.length === 0 ||
            resolvedRuntimes.some((runtime) => runtime.target === 'node');
          const useBrowserTarget =
            resolvedRuntimes.length === 0 ||
            resolvedRuntimes.some((runtime) => runtime.target === 'browser');

          if (useNodeTarget) {
            targets.push('current node');
          }

          if (useBrowserTarget) {
            // We expect developers to use a recent version of a browser with great developer tools
            targets.push(
              'last 1 chrome version',
              'last 1 safari version',
              'last 1 firefox version',
            );
          }

          return targets;
        });
      });
    },
    test({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        browserslistTargets: waterfall(),
        browserslistTargetName: waterfall(),
      }));

      configure(({browserslistTargets}) => {
        const defaultTargets = ['current node'];

        browserslistTargets!((existingTargets) =>
          existingTargets.length > 0 ? existingTargets : defaultTargets,
        );
      });
    },
  });
}

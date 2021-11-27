import {
  Runtime,
  DiagnosticError,
  createProjectPlugin,
  ProjectKind,
  createWorkspacePlugin,
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
        ({runtime, targets, targetName, babelTargets, babelPresets}) => {
          targets!(async (targets) => {
            if (targets.length > 0) return targets;

            const resolvedRuntime = await runtime!.run();

            const useNodeTarget = resolvedRuntime.includes(Runtime.Node);
            const useBrowserTarget = resolvedRuntime.includes(Runtime.Browser);

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
                targetName!.run(undefined),
              ]);

              const browserslistConfig = browserslist.findConfig(
                project.fs.root,
              );

              const matchingConfiguration =
                browserslistConfig?.[env ?? 'defaults'];

              if (env != null && matchingConfiguration == null) {
                throw new DiagnosticError({
                  title: `Could not find browserslist configuration for environment ${JSON.stringify(
                    targetName,
                  )} in project ${JSON.stringify(project.name)}`,
                });
              }

              targets.push(...(matchingConfiguration ?? ['defaults']));
            }

            return targets;
          });

          babelTargets?.(() => targets!.run([]));
          babelPresets?.((presets) => {
            const isPackage = project.kind === ProjectKind.Package;

            const options = isPackage
              ? {
                  useBuiltIns: false,
                  bugfixes: true,
                  shippedProposals: true,
                  // I thought I wanted this on, but if you do this, Babel
                  // stops respecting the top-level `targets` option and tries
                  // to use the targets passed to the preset directly instead.
                  // ignoreBrowserslistConfig: true,
                }
              : {
                  corejs: '3.15',
                  useBuiltIns: 'usage',
                  bugfixes: true,
                  shippedProposals: true,
                  // I thought I wanted this on, but if you do this, Babel
                  // stops respecting the top-level `targets` option and tries
                  // to use the targets passed to the preset directly instead.
                  // ignoreBrowserslistConfig: true,
                };

            presets.unshift(['@babel/preset-env', options]);

            return presets;
          });
        },
      );
    },
    develop({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        targets: waterfall(),
        targetName: waterfall(),
      }));

      configure(({runtime, targets, babelTargets, babelPresets}) => {
        targets!(async (targets) => {
          if (targets.length > 0) return targets;

          const resolvedRuntime = await runtime!.run();

          const useNodeTarget = resolvedRuntime.includes(Runtime.Node);
          const useBrowserTarget = resolvedRuntime.includes(Runtime.Browser);

          if (useNodeTarget) {
            targets.push('current node');
          }

          if (useBrowserTarget) {
            targets.push('last 1 major version');
          }

          return targets;
        });

        babelTargets?.(() => targets!.run([]));
        babelPresets?.((presets) => [
          [
            '@babel/preset-env',
            {
              corejs: '3.15',
              useBuiltIns: 'usage',
              bugfixes: true,
              shippedProposals: true,
            },
          ],
          ...presets,
        ]);
      });
    },
    test({hooks, configure}) {
      hooks<TargetHooks>(({waterfall}) => ({
        targets: waterfall(),
        targetName: waterfall(),
      }));

      configure(({targets, babelPresets, babelTargets}) => {
        const defaultTargets = ['current node'];

        targets!((existingTargets) =>
          existingTargets.length > 0 ? existingTargets : defaultTargets,
        );

        babelTargets?.(() => targets!.run([]));
        babelPresets?.((presets) => [
          [
            '@babel/preset-env',
            {
              corejs: '3.15',
              useBuiltIns: 'usage',
              bugfixes: true,
              shippedProposals: true,
            },
          ],
          ...presets,
        ]);
      });
    },
  });
}

/**
 * Customizes Babel for tools operating on the whole workspace.
 */
export function workspaceTargets() {
  return createWorkspacePlugin({
    name: 'SewingKit.Targets.Workspace',
    build({configure}) {
      configure(({babelPresets, babelTargets}) => {
        const defaultTargets = ['current node'];

        babelTargets?.((existingTargets) =>
          existingTargets.length > 0 ? existingTargets : defaultTargets,
        );

        babelPresets?.((presets) => [
          ...presets,
          [
            '@babel/preset-env',
            {
              corejs: '3.15',
              useBuiltIns: 'usage',
              bugfixes: true,
              shippedProposals: true,
            },
          ],
        ]);
      });
    },
    develop({configure}) {
      configure(({babelPresets, babelTargets}) => {
        const defaultTargets = ['current node'];

        babelTargets?.((existingTargets) =>
          existingTargets.length > 0 ? existingTargets : defaultTargets,
        );

        babelPresets?.((presets) => [
          ...presets,
          [
            '@babel/preset-env',
            {
              corejs: '3.15',
              useBuiltIns: 'usage',
              bugfixes: true,
              shippedProposals: true,
            },
          ],
        ]);
      });
    },
    test({configure}) {
      configure(({babelPresets, babelTargets}) => {
        const defaultTargets = ['current node'];

        babelTargets?.((existingTargets) =>
          existingTargets.length > 0 ? existingTargets : defaultTargets,
        );

        babelPresets?.((presets) => [
          ...presets,
          [
            '@babel/preset-env',
            {
              corejs: '3.15',
              useBuiltIns: 'usage',
              bugfixes: true,
              shippedProposals: true,
            },
          ],
        ]);
      });
    },
  });
}

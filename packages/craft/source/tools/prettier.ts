import {createWorkspacePlugin, type WaterfallHook} from '../kit.ts';

export interface PrettierHooks {
  prettierExtensions: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface LintWorkspaceConfigurationHooks extends PrettierHooks {}
}

export interface Options {
  /**
   * The extensions to format with prettier. If you know what kinds of
   * files you want to format, and these files have extensions that prettier
   * does not know to format by default, you can include them here. Note that,
   * if you change this option, only files matching the extensions you pass
   * will be formatted with Prettier. If you want to add additional extensions
   * to the default list (or you want to prevent any of the default extensions
   * from being processed), you can use the `prettierExtensions` workspace lint
   * hook provided by this plugin instead.
   */
  extensions?: string[];
}

export const DEFAULT_EXTENSIONS = [
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.graphql',
  '.gql',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
  '.vue',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
];

/**
 * Runs prettier on your workspace.
 */
export function prettier({
  extensions: defaultExtensions = DEFAULT_EXTENSIONS,
}: Options = {}) {
  return createWorkspacePlugin({
    name: 'Quilt.Prettier',
    lint({hooks, run, options, workspace}) {
      hooks<PrettierHooks>(({waterfall}) => ({
        prettierExtensions: waterfall(),
      }));

      run((step, {configuration}) =>
        step({
          name: 'Quilt.Prettier',
          label: 'Running Prettier on your workspace',
          async run(step) {
            const {prettierExtensions} = await configuration();
            const extensions = await prettierExtensions!.run(defaultExtensions);

            if (extensions.length === 0) return;

            const glob =
              extensions.length === 1
                ? `./**/*.${stripLeadingDot(extensions[0]!)}`
                : `./**/*.{${extensions
                    .map((extension) => stripLeadingDot(extension))
                    .join(',')}}`;

            const result = await step.exec(
              'prettier',
              [
                glob,
                options.fix ? '--write' : '--check',
                '--no-error-on-unmatched-pattern',
                '--cache',
                '--cache-location',
                workspace.fs.temporaryPath('prettier/cache'),
              ],
              {
                fromNodeModules: import.meta.url,
              },
            );

            const output = result.stdout.trim();
            if (output.length) step.log(output);
          },
        }),
      );
    },
  });
}

function stripLeadingDot(extension: string) {
  return extension.startsWith('.') ? extension.slice(1) : extension;
}

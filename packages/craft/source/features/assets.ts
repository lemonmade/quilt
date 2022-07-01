import * as path from 'path';

import {createProjectPlugin} from '../kit';
import type {WaterfallHookWithDefault} from '../kit';

import type {} from '../tools/jest';
import type {} from '../tools/rollup';
import {DEFAULT_STATIC_ASSET_EXTENSIONS} from '../constants';

const NAME = 'Quilt.Assets';

export interface AssetHooks {
  /**
   * The base URL for assets in this application. This value is used in the
   * Quilt asset manifest, during async loading, and by a number of other
   * additions to Quilt in order to correctly load assets.
   */
  quiltAssetBaseUrl: WaterfallHookWithDefault<string>;

  /**
   * The file extensions that will be considered as static assets. When you import these
   * files, Quilt will copy them to your output directory with the hash of the file contents
   * in the file name, and will replace the import with a URL pointing to this asset.
   */
  quiltAssetStaticExtensions: WaterfallHookWithDefault<readonly string[]>;

  /**
   * The file size limit for inlining static assets into your JavaScript bundles.
   * When you import a file that is less than this size, Quilt will convert it to
   * a bas64-encoded data URI; when the asset is larger than this size, it will
   * instead be output as an asset file, and Quilt will replace the import with
   * a URL pointing at that asset.
   *
   * Inlining images reduces network requests at the expense of a larger image size.
   * By default, this inlining is only performed for images less than 4KB, and is
   * never applied to SVG files.
   */
  quiltAssetStaticInlineLimit: WaterfallHookWithDefault<number>;

  /**
   * The pattern used when generating the file name for static assets being copied
   * to your output directory. By default, the output files will have the same file
   * name and extension as the input files, separated by the file’s content hash.
   */
  quiltAssetStaticOutputFilenamePattern: WaterfallHookWithDefault<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends AssetHooks {}
  interface DevelopProjectConfigurationHooks
    extends Pick<AssetHooks, 'quiltAssetStaticExtensions'> {}
}

export interface AssetOptions {
  /**
   * The base URL where your assets are hosted. The default is `/assets/`,
   * which means that Quilt assumes assets are hosted on the same domain
   * as your application, under the `/assets/` path. This base URL is used
   * internally by Quilt in a number of places to make sure it always loads
   * your assets from the right spot.
   *
   * If you host your assets on a dedicated CDN domain, you will need to make
   * sure this value is the whole URL, like `https://my-cdn.com/assets/`.
   */
  baseUrl: string;

  /**
   * Controls how Quilt inlines assets into your bundles.
   */
  inline?:
    | boolean
    | {
        /**
         * The maximum size in bytes that an asset should be in order to
         * be inlined into the bundle. Defaults to `4096`.
         */
        limit?: number;
      };
}

export function assets({baseUrl, inline: explicitInline}: AssetOptions) {
  let assetsInline: Exclude<AssetOptions['inline'], boolean | undefined>;

  if (typeof explicitInline === 'boolean') {
    assetsInline = explicitInline ? {} : {limit: 0};
  } else {
    assetsInline = explicitInline ?? {};
  }

  return createProjectPlugin({
    name: NAME,
    build({project, configure, hooks}) {
      hooks<AssetHooks>(({waterfall}) => ({
        quiltAssetBaseUrl: waterfall({
          default: baseUrl,
        }),
        quiltAssetStaticExtensions: waterfall<readonly string[]>({
          default: () => [...DEFAULT_STATIC_ASSET_EXTENSIONS],
        }),
        quiltAssetStaticInlineLimit: waterfall({
          default: assetsInline.limit ?? 4096,
        }),
        quiltAssetStaticOutputFilenamePattern: waterfall({
          default: '[name].[hash].[ext]',
        }),
      }));

      configure(
        (
          {
            rollupPlugins,
            quiltAssetBaseUrl,
            quiltAssetStaticExtensions,
            quiltAssetStaticInlineLimit,
            quiltAssetStaticOutputFilenamePattern,
          },
          {quiltAppBrowser},
        ) => {
          rollupPlugins?.(async (plugins) => {
            const [
              {staticAssets, rawAssets},
              baseUrl,
              extensions,
              inlineLimit,
              outputPattern,
            ] = await Promise.all([
              import('../plugins/rollup/assets'),
              quiltAssetBaseUrl!.run(),
              quiltAssetStaticExtensions!.run(),
              quiltAssetStaticInlineLimit!.run(),
              quiltAssetStaticOutputFilenamePattern!.run(),
            ]);

            return [
              ...plugins,
              rawAssets(),
              staticAssets({
                emit: Boolean(quiltAppBrowser),
                baseUrl,
                extensions,
                inlineLimit,
                outputPattern,
                name: (file) =>
                  path.posix.normalize(project.fs.relativePath(file)),
              }),
            ];
          });
        },
      );
    },
    develop({workspace, configure, hooks}) {
      hooks<Pick<AssetHooks, 'quiltAssetStaticExtensions'>>(({waterfall}) => ({
        quiltAssetStaticExtensions: waterfall<readonly string[]>({
          default: () => [...DEFAULT_STATIC_ASSET_EXTENSIONS],
        }),
      }));

      configure(({rollupPlugins, quiltAssetStaticExtensions}) => {
        rollupPlugins?.(async (plugins) => {
          const [{staticAssetsDevelopment, rawAssets}, extensions] =
            await Promise.all([
              import('../plugins/rollup/assets'),
              quiltAssetStaticExtensions!.run(),
            ]);

          return [
            ...plugins,
            rawAssets(),
            staticAssetsDevelopment({root: workspace.fs.root, extensions}),
          ];
        });
      });
    },
    test({configure}) {
      configure(({jestModuleMapper, jestTransforms}) => {
        jestTransforms?.((transforms) => {
          const assetsMatcher = DEFAULT_STATIC_ASSET_EXTENSIONS.map(
            (extension) =>
              extension.startsWith('.') ? extension.slice(1) : extension,
          ).join('|');

          return {
            ...transforms,
            [`\\.(${assetsMatcher})$`]: '@quilted/craft/jest/assets.cjs',
          };
        });

        jestModuleMapper?.((moduleMapper) => {
          return {
            ...moduleMapper,
            '\\.module.css$': '@quilted/craft/jest/css-modules.cjs',
            '\\.css$': '@quilted/craft/jest/styles.cjs',
          };
        });
      });
    },
  });
}

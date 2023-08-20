import * as path from 'path';
import type {Options as RollupOptions} from '@quilted/assets/rollup';

import {
  createProjectPlugin,
  type WaterfallHook,
  type WaterfallHookWithDefault,
} from '../kit.ts';

import type {} from '../tools/jest.ts';
import type {} from '../tools/rollup.ts';
import {DEFAULT_STATIC_ASSET_EXTENSIONS} from '../constants.ts';

const NAME = 'Quilt.Assets';

export interface AssetHooks {
  /**
   * The base URL for assets in this application. This value is used in the
   * Quilt asset manifest, during async loading, and by a number of other
   * additions to Quilt in order to correctly load assets.
   */
  quiltAssetBaseUrl: WaterfallHookWithDefault<string>;

  /**
   * The directory to create browser assets in. If this URL is relative,
   * it will be resolved relative to the result of the `outputRoot` directory.
   * If this URL is absolute, it will be used as-is. It will be called initially
   * with a value inferred from the `quiltAssetBaseUrl`, defaulting to `assets`.
   */
  quiltAssetOutputRoot: WaterfallHook<string>;

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

  quiltAssetManifest: WaterfallHookWithDefault<boolean>;
  quiltAssetManifestId: WaterfallHookWithDefault<RollupOptions['id']>;
  quiltAssetManifestPath: WaterfallHookWithDefault<RollupOptions['path']>;
  quiltAssetManifestPriority: WaterfallHookWithDefault<
    RollupOptions['priority']
  >;
  quiltAssetManifestCacheKey: WaterfallHookWithDefault<
    RollupOptions['cacheKey']
  >;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends AssetHooks {}
  interface DevelopProjectConfigurationHooks
    extends Pick<
      AssetHooks,
      'quiltAssetBaseUrl' | 'quiltAssetStaticExtensions'
    > {}
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
        quiltAssetOutputRoot: waterfall(),
        quiltAssetStaticExtensions: waterfall<readonly string[]>({
          default: () => [...DEFAULT_STATIC_ASSET_EXTENSIONS],
        }),
        quiltAssetStaticInlineLimit: waterfall({
          default: assetsInline.limit ?? 4096,
        }),
        quiltAssetStaticOutputFilenamePattern: waterfall({
          default: '[name].[hash].[ext]',
        }),
        quiltAssetManifest: waterfall<boolean>({
          default: true,
        }),
        quiltAssetManifestId: waterfall<RollupOptions['id']>({
          default: undefined,
        }),
        quiltAssetManifestPath: waterfall<RollupOptions['path']>({
          default: project.fs.buildPath('manifests/assets.json'),
        }),
        quiltAssetManifestPriority: waterfall<RollupOptions['priority']>({
          default: undefined,
        }),
        quiltAssetManifestCacheKey: waterfall<RollupOptions['cacheKey']>({
          default: undefined,
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
            quiltAssetManifest,
            quiltAssetManifestId,
            quiltAssetManifestPath,
            quiltAssetManifestCacheKey,
            quiltAssetManifestPriority,
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
              includeManifest,
            ] = await Promise.all([
              import('../plugins/rollup/assets.ts'),
              quiltAssetBaseUrl!.run(),
              quiltAssetStaticExtensions!.run(),
              quiltAssetStaticInlineLimit!.run(),
              quiltAssetStaticOutputFilenamePattern!.run(),
              quiltAssetManifest!.run(),
              quiltAssetManifestId!.run(),
              quiltAssetManifestPath!.run(),
              quiltAssetManifestCacheKey!.run(),
              quiltAssetManifestPriority!.run(),
            ]);

            const newPlugins = [
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

            if (includeManifest) {
              const [{assetManifest}, id, path, cacheKey, priority] =
                await Promise.all([
                  import('@quilted/assets/rollup'),
                  quiltAssetManifestId!.run(),
                  quiltAssetManifestPath!.run(),
                  quiltAssetManifestCacheKey!.run(),
                  quiltAssetManifestPriority!.run(),
                ]);

              newPlugins.push(
                assetManifest({id, path, cacheKey, priority, baseUrl}),
              );
            }

            return [...plugins, ...newPlugins];
          });
        },
      );
    },
    develop({workspace, configure, hooks}) {
      hooks<
        Pick<AssetHooks, 'quiltAssetBaseUrl' | 'quiltAssetStaticExtensions'>
      >(({waterfall}) => ({
        quiltAssetBaseUrl: waterfall({default: '/'}),
        quiltAssetStaticExtensions: waterfall<readonly string[]>({
          default: () => [...DEFAULT_STATIC_ASSET_EXTENSIONS],
        }),
      }));

      configure(({rollupPlugins, quiltAssetStaticExtensions}) => {
        rollupPlugins?.(async (plugins) => {
          const [{staticAssetsDevelopment, rawAssets}, extensions] =
            await Promise.all([
              import('../plugins/rollup/assets.ts'),
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

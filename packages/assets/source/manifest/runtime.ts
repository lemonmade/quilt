import type {AssetsCacheKey} from '../cache-key';
import type {
  BrowserAssets,
  BrowserAssetSelector,
  BrowserAssetsEntry,
} from '../types';
import type {AssetsBuildManifest, AssetsBuildManifestEntry} from './types';

const DEFAULT_CACHE_KEY_NAME = '__default';

export function createBrowserAssetsFromManifests<CacheKey = AssetsCacheKey>(
  manifests: AssetsBuildManifest<CacheKey>[],
  {
    cacheKey,
    defaultManifest,
  }: Pick<BrowserAssets<CacheKey>, 'cacheKey'> & {
    defaultManifest?: AssetsBuildManifest<CacheKey>;
  } = {},
): BrowserAssets<CacheKey> {
  const manifestMap = new Map<string, AssetsBuildManifest<CacheKey>>();

  for (const manifest of manifests) {
    manifestMap.set(
      manifest.cacheKey
        ? normalizeCacheKey(manifest.cacheKey)
        : DEFAULT_CACHE_KEY_NAME,
      manifest,
    );
  }

  if (defaultManifest) {
    manifestMap.set(DEFAULT_CACHE_KEY_NAME, defaultManifest);
  }

  return {
    entry(options) {
      const manifest = resolveManifest(options?.cacheKey);

      if (manifest == null) return {styles: [], scripts: []};

      return createAssetsEntryFromManifest(manifest, {
        ...options,
        entry: true,
      });
    },
    modules(modules, options) {
      const manifest = resolveManifest(options?.cacheKey);

      if (manifest == null) return {styles: [], scripts: []};

      return createAssetsEntryFromManifest(manifest, {
        ...options,
        modules,
        entry: false,
      });
    },
    cacheKey,
  };

  function resolveManifest(
    cacheKey?: CacheKey,
  ): AssetsBuildManifest<CacheKey> | undefined {
    if (cacheKey == null) return manifestMap.get(DEFAULT_CACHE_KEY_NAME);

    return manifestMap.get(normalizeCacheKey(cacheKey));
  }

  function normalizeCacheKey(cacheKey: CacheKey) {
    const normalized: Record<string, any> = {};

    for (const key of Object.keys(cacheKey as any).sort()) {
      const value = (cacheKey as any)[key];

      if (value == null) continue;

      normalized[key] = value;
    }

    return JSON.stringify(normalized);
  }
}

export function createAssetsEntryFromManifest<CacheKey = AssetsCacheKey>(
  manifest: AssetsBuildManifest<CacheKey>,
  {
    entry,
    modules,
  }: Pick<BrowserAssetSelector<CacheKey>, 'modules'> & {entry?: boolean} = {},
): BrowserAssetsEntry {
  const styles = new Set<number>();
  const scripts = new Set<number>();

  if (entry) {
    addAssetsBuildManifestEntry(manifest.entries.default, styles, scripts);
  }

  if (modules) {
    for (const module of modules) {
      const moduleId =
        typeof module === 'string'
          ? module
          : typeof (module as any).id === 'string'
          ? (module as any).id
          : // TODO: handle regex
            undefined;

      const moduleAssets = manifest.modules[moduleId];

      if (moduleAssets) {
        addAssetsBuildManifestEntry(moduleAssets, styles, scripts);
      }
    }
  }

  const styleAttributes = manifest.attributes?.styles ?? {};
  const scriptAttributes = manifest.attributes?.scripts ?? {};

  return {
    styles: [...styles].map((index) => {
      return {
        source: manifest.assets[index]!,
        attributes: styleAttributes,
      };
    }),
    scripts: [...scripts].map((index) => {
      return {
        source: manifest.assets[index]!,
        attributes: scriptAttributes,
      };
    }),
  };
}

function addAssetsBuildManifestEntry(
  entry: AssetsBuildManifestEntry,
  styles: Set<number>,
  scripts: Set<number>,
) {
  for (const index of entry.styles) {
    styles.add(index);
  }

  for (const index of entry.scripts) {
    scripts.add(index);
  }
}

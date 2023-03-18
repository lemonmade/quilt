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

      return createBrowserAssetsEntryFromManifest(manifest, {
        ...options,
        entry: true,
      });
    },
    modules(modules, options) {
      const manifest = resolveManifest(options?.cacheKey);

      if (manifest == null) return {styles: [], scripts: []};

      return createBrowserAssetsEntryFromManifest(manifest, {
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

    return (
      manifestMap.get(normalizeCacheKey(cacheKey)) ??
      manifestMap.get(DEFAULT_CACHE_KEY_NAME)
    );
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

export function createBrowserAssetsEntryFromManifest<CacheKey = AssetsCacheKey>(
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
      let includeStyles = true;
      let includeScripts = true;
      let moduleId: string | RegExp;

      if (typeof module === 'string') {
        moduleId = module;
      } else if (module instanceof RegExp) {
        moduleId = module;
      } else {
        includeStyles = module.styles ?? true;
        includeScripts = module.scripts ?? true;
        moduleId = module.id;
      }

      const moduleAssets = manifest.modules[String(moduleId)];

      if (moduleAssets) {
        addAssetsBuildManifestEntry(
          moduleAssets,
          includeStyles && styles,
          includeScripts && scripts,
        );
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
  styles: Set<number> | false,
  scripts: Set<number> | false,
) {
  if (styles) {
    for (const index of entry.styles) {
      styles.add(index);
    }
  }

  if (scripts) {
    for (const index of entry.scripts) {
      scripts.add(index);
    }
  }
}

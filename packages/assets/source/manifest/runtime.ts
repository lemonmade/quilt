import type {AssetsCacheKey} from '../cache-key.ts';
import type {
  Asset,
  BrowserAssets,
  BrowserAssetSelector,
  BrowserAssetsEntry,
} from '../types.ts';
import type {AssetBuildManifest} from './types.ts';

const DEFAULT_CACHE_KEY_NAME = '__default__';

interface NormalizedAssetBuildManifest
  extends Omit<AssetBuildManifest, 'assets' | 'modules'> {
  assets: {
    styles: Map<number, Asset>;
    scripts: Map<number, Asset>;
  };
  modules: Record<
    string,
    {
      styles: Asset[];
      scripts: Asset[];
    }
  >;
}

export class BrowserAssetsFromManifests<CacheKey = AssetsCacheKey>
  implements BrowserAssets<CacheKey>
{
  readonly cacheKey: BrowserAssets<CacheKey>['cacheKey'];
  #manifestMap: Map<string, NormalizedAssetBuildManifest>;

  constructor(
    manifests: AssetBuildManifest[],
    {
      cacheKey,
      defaultManifest,
    }: Pick<BrowserAssets<CacheKey>, 'cacheKey'> & {
      defaultManifest?: AssetBuildManifest;
    } = {},
  ) {
    const manifestMap = new Map<string, NormalizedAssetBuildManifest>();

    for (const manifest of manifests) {
      manifestMap.set(
        manifest.key ?? DEFAULT_CACHE_KEY_NAME,
        normalizeAssetBuildManifest(manifest),
      );
    }

    if (defaultManifest) {
      manifestMap.set(
        DEFAULT_CACHE_KEY_NAME,
        normalizeAssetBuildManifest(defaultManifest),
      );
    }

    this.cacheKey = cacheKey;
    this.#manifestMap = manifestMap;
  }

  entry(options?: BrowserAssetSelector<CacheKey>) {
    const manifest = resolveManifest(this.#manifestMap, options?.cacheKey);

    if (manifest == null) return {styles: [], scripts: []};

    return createBrowserAssetsEntryFromManifest(manifest, {
      ...options,
      entry: options?.id ?? '.',
    });
  }

  modules(
    modules: NonNullable<BrowserAssetSelector<CacheKey>['modules']>,
    options?: Pick<BrowserAssetSelector<CacheKey>, 'cacheKey'>,
  ) {
    const manifest = resolveManifest(this.#manifestMap, options?.cacheKey);

    if (manifest == null) return {styles: [], scripts: []};

    return createBrowserAssetsEntryFromManifest(manifest, {
      ...options,
      modules,
    });
  }
}

function resolveManifest<CacheKey = AssetsCacheKey>(
  manifestMap: Map<string, NormalizedAssetBuildManifest>,
  cacheKey?: CacheKey,
): NormalizedAssetBuildManifest | undefined {
  if (cacheKey == null) return manifestMap.get(DEFAULT_CACHE_KEY_NAME);

  return (
    manifestMap.get(normalizeCacheKey(cacheKey)) ??
    manifestMap.get(DEFAULT_CACHE_KEY_NAME)
  );
}

function normalizeCacheKey<CacheKey>(cacheKey: CacheKey) {
  const searchParams = new URLSearchParams();

  for (const key of Object.keys(cacheKey as any).sort()) {
    const value = (cacheKey as any)[key];

    if (value == null) continue;

    searchParams.set(key, value);
  }

  return searchParams.toString();
}

// Keep a cache since we often have the same manifest used as the default and
// for a specific cache key
const NORMALIZED_ASSET_BUILD_MANIFEST_CACHE = new WeakMap<
  AssetBuildManifest,
  NormalizedAssetBuildManifest
>();

function normalizeAssetBuildManifest(
  manifest: AssetBuildManifest,
): NormalizedAssetBuildManifest {
  let normalized = NORMALIZED_ASSET_BUILD_MANIFEST_CACHE.get(manifest);
  if (normalized) return normalized;

  const assets: NormalizedAssetBuildManifest['assets'] = {
    styles: new Map(),
    scripts: new Map(),
  };
  const modules: NormalizedAssetBuildManifest['modules'] = {};

  let base = manifest.base ?? '';
  if (base.length > 0 && !base.endsWith('/')) base += '/';

  const styleAttributes = manifest.attributes?.[1] ?? {};
  const scriptAttributes = manifest.attributes?.[2] ?? {};

  manifest.assets.forEach((asset, index) => {
    const [type, source, integrity, attributes] = asset;

    if (type === 1) {
      assets.styles.set(index, {
        source: base + source,
        attributes: {integrity: integrity!, ...styleAttributes, ...attributes},
      });
    } else if (type === 2) {
      assets.scripts.set(index, {
        source: base + source,
        attributes: {integrity: integrity!, ...scriptAttributes, ...attributes},
      });
    }
  });

  for (const [module, assetIndexes] of Object.entries(manifest.modules)) {
    const moduleAssets: (typeof modules)[string] = {styles: [], scripts: []};

    for (const index of assetIndexes) {
      if (assets.styles.has(index)) {
        moduleAssets.styles.push(assets.styles.get(index)!);
      } else if (assets.scripts.has(index)) {
        moduleAssets.scripts.push(assets.scripts.get(index)!);
      }
    }

    modules[module] = moduleAssets;
  }

  normalized = {...manifest, assets, modules};
  NORMALIZED_ASSET_BUILD_MANIFEST_CACHE.set(manifest, normalized);

  return normalized;
}

function createBrowserAssetsEntryFromManifest<CacheKey = AssetsCacheKey>(
  manifest: NormalizedAssetBuildManifest,
  {
    entry,
    modules,
  }: Pick<BrowserAssetSelector<CacheKey>, 'modules'> & {entry?: string} = {},
): BrowserAssetsEntry {
  const styles = new Set<Asset>();
  const scripts = new Set<Asset>();

  if (entry) {
    const entryModuleID = manifest.entries[entry];
    const entryModule = entryModuleID
      ? manifest.modules[entryModuleID]
      : undefined;
    if (entryModule) addAssetBuildManifestEntry(entryModule, styles, scripts);
  }

  if (modules) {
    for (const module of modules) {
      let includeStyles = true;
      let includeScripts = true;
      let moduleId: string;

      if (typeof module === 'string') {
        moduleId = module;
      } else {
        includeStyles = module.styles ?? true;
        includeScripts = module.scripts ?? true;
        moduleId = module.id;
      }

      const moduleAssets = manifest.modules[moduleId];

      if (moduleAssets) {
        addAssetBuildManifestEntry(
          moduleAssets,
          includeStyles && styles,
          includeScripts && scripts,
        );
      }
    }
  }

  return {
    styles: [...styles],
    scripts: [...scripts],
  };
}

function addAssetBuildManifestEntry(
  entry: NormalizedAssetBuildManifest['modules'][string],
  styles: Set<Asset> | false,
  scripts: Set<Asset> | false,
) {
  if (styles) {
    for (const asset of entry.styles) {
      styles.add(asset);
    }
  }

  if (scripts) {
    for (const asset of entry.scripts) {
      scripts.add(asset);
    }
  }
}

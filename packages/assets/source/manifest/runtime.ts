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

export class BrowserAssetsFromManifests implements BrowserAssets {
  readonly cacheKey: (request: Request) => string | undefined;
  readonly #manifestMap: Map<string, NormalizedAssetBuildManifest>;

  constructor(
    manifests: AssetBuildManifest[],
    {
      cacheKey,
      defaultManifest,
    }: {
      cacheKey?(request: Request): Record<string, any>;
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

    this.#manifestMap = manifestMap;

    const cacheKeyCache = new WeakMap<Request, string>();
    this.cacheKey = (request) => {
      if (cacheKey == null) return undefined;
      if (cacheKeyCache.has(request)) return cacheKeyCache.get(request)!;

      const key = normalizeCacheKey(cacheKey(request));
      cacheKeyCache.set(request, key);

      return key;
    };
  }

  entry(options?: BrowserAssetSelector) {
    const manifest = this.#resolveManifest(options?.request);

    if (manifest == null) return {styles: [], scripts: []};

    return createBrowserAssetsEntryFromManifest(manifest, {
      ...options,
      entry: options?.id ?? '.',
    });
  }

  modules(
    modules: NonNullable<BrowserAssetSelector['modules']>,
    options?: Pick<BrowserAssetSelector, 'request'>,
  ) {
    const manifest = this.#resolveManifest(options?.request);

    if (manifest == null) return {styles: [], scripts: []};

    return createBrowserAssetsEntryFromManifest(manifest, {
      ...options,
      modules,
    });
  }

  #resolveManifest(request?: Request) {
    const manifestMap = this.#manifestMap;
    const cacheKey = request ? this.cacheKey(request) : undefined;
    const manifest = cacheKey ? manifestMap.get(cacheKey) : undefined;

    return manifest ?? manifestMap.get(DEFAULT_CACHE_KEY_NAME);
  }
}

function normalizeCacheKey(cacheKey: unknown) {
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

const INTEGRITY_VALUE_REGEXP = /^(sha256|sha384|sha512)-[A-Za-z0-9+/=]{44,}$/;

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
    const [type, source, integrityOrContent, attributes] = asset;

    const resolvedAsset: Asset = {
      source: base + source,
      attributes: {},
    };

    if (integrityOrContent) {
      if (INTEGRITY_VALUE_REGEXP.test(integrityOrContent)) {
        resolvedAsset.attributes!.integrity = integrityOrContent;
      } else {
        resolvedAsset.content = integrityOrContent;
      }
    }

    if (type === 1) {
      Object.assign(resolvedAsset.attributes!, styleAttributes, attributes);
      assets.styles.set(index, resolvedAsset);
    } else if (type === 2) {
      Object.assign(resolvedAsset.attributes!, scriptAttributes, attributes);
      assets.scripts.set(index, resolvedAsset);
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

function createBrowserAssetsEntryFromManifest(
  manifest: NormalizedAssetBuildManifest,
  {
    entry,
    modules,
  }: Pick<BrowserAssetSelector, 'modules'> & {entry?: string} = {},
): BrowserAssetsEntry {
  const styles = new Set<Asset>();
  const scripts = new Set<Asset>();

  if (entry) {
    // Allow developers to omit the leading ./ from nested entrypoints, so they can pass
    // either `entry: 'foo/bar'` or `entry: './foo/bar'` and still get the entry assets
    const entryModuleID =
      manifest.entries[entry] ?? manifest.entries[`./${entry}`];
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

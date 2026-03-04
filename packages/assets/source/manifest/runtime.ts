import type {
  Asset,
  BrowserAssets,
  BrowserAssetSelector,
  BrowserAssetsEntry,
} from '../types.ts';
import type {AssetBuildManifest} from './types.ts';

const DEFAULT_CACHE_KEY_NAME = '__default__';

interface NormalizedModuleEntry {
  script?: {
    asset: Asset;
    sync: Asset[];
    async: Asset[];
  };
  style?: {
    asset: Asset;
    sync: Asset[];
    async: Asset[];
  };
}

interface NormalizedAssetBuildManifest
  extends Omit<AssetBuildManifest, 'assets' | 'modules'> {
  assets: {
    styles: Map<number, Asset>;
    scripts: Map<number, Asset>;
  };
  modules: Record<string, NormalizedModuleEntry>;
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

  entry(
    options?: Pick<BrowserAssetSelector, 'id' | 'request'>,
  ): BrowserAssetsEntry {
    const manifest = this.#resolveManifest(options?.request);

    if (manifest == null) return EMPTY_ENTRY;

    const entryName = options?.id ?? '.';
    const entryModuleID =
      manifest.entries[entryName] ?? manifest.entries[`./${entryName}`];
    const module = entryModuleID ? manifest.modules[entryModuleID] : undefined;

    if (!module) return EMPTY_ENTRY;

    return normalizedModuleToEntry(module);
  }

  modules(
    modules: Iterable<string>,
    options?: Pick<BrowserAssetSelector, 'request'>,
  ): readonly BrowserAssetsEntry[] {
    const manifest = this.#resolveManifest(options?.request);

    if (manifest == null) return [];

    const entries: BrowserAssetsEntry[] = [];

    for (const moduleId of modules) {
      const module = manifest.modules[moduleId];
      entries.push(module ? normalizedModuleToEntry(module) : EMPTY_ENTRY);
    }

    return entries;
  }

  #resolveManifest(request?: Request) {
    const manifestMap = this.#manifestMap;
    const cacheKey = request ? this.cacheKey(request) : undefined;
    const manifest = cacheKey ? manifestMap.get(cacheKey) : undefined;

    return manifest ?? manifestMap.get(DEFAULT_CACHE_KEY_NAME);
  }
}

function normalizedModuleToEntry(
  module: NormalizedModuleEntry,
): BrowserAssetsEntry {
  return {
    script: module.script
      ? {
          asset: module.script.asset,
          syncDependencies: module.script.sync,
          asyncDependencies: module.script.async,
        }
      : undefined,
    style: module.style
      ? {
          asset: module.style.asset,
          syncDependencies: module.style.sync,
          asyncDependencies: module.style.async,
        }
      : undefined,
  };
}

const EMPTY_ENTRY: BrowserAssetsEntry = {
  script: undefined,
  style: undefined,
};

function normalizeCacheKey(cacheKey: unknown) {
  const searchParams = new URLSearchParams();

  for (const key of Object.keys(cacheKey as any).sort()) {
    const value = (cacheKey as any)[key];

    if (value == null) continue;

    searchParams.set(key, value);
  }

  return searchParams.toString();
}

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

  function resolveScript(index: number): Asset | undefined {
    return assets.scripts.get(index);
  }

  function resolveStyle(index: number): Asset | undefined {
    return assets.styles.get(index);
  }

  function resolveAll<T>(
    indices: number[] | undefined,
    resolve: (i: number) => T | undefined,
  ): T[] {
    if (!indices?.length) return [];
    return indices.map(resolve).filter((a): a is T => a != null);
  }

  for (const [moduleId, entry] of Object.entries(manifest.modules)) {
    const normalizedEntry: NormalizedModuleEntry = {};

    // entry[0] = script, entry[2] = scriptSync, entry[4] = scriptAsync
    const scriptAsset = entry[0] != null ? resolveScript(entry[0]) : undefined;
    if (scriptAsset) {
      normalizedEntry.script = {
        asset: scriptAsset,
        sync: resolveAll(entry[2], resolveScript),
        async: resolveAll(entry[4], resolveScript),
      };
    }

    // entry[1] = style, entry[3] = styleSync, entry[5] = styleAsync
    const styleAsset = entry[1] != null ? resolveStyle(entry[1]) : undefined;
    if (styleAsset) {
      normalizedEntry.style = {
        asset: styleAsset,
        sync: resolveAll(entry[3], resolveStyle),
        async: resolveAll(entry[5], resolveStyle),
      };
    }

    modules[moduleId] = normalizedEntry;
  }

  normalized = {...manifest, assets, modules};
  NORMALIZED_ASSET_BUILD_MANIFEST_CACHE.set(manifest, normalized);

  return normalized;
}

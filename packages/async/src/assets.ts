export interface Asset {
  readonly source: string;
  readonly integrity?: string;
}

export interface ManifestEntry {
  readonly scripts: Asset[];
  readonly styles: Asset[];
}

export interface Manifest {
  readonly id: string;
  readonly format: 'esm' | 'systemjs';
  readonly default: boolean;
  readonly metadata: Record<string, any>;
  readonly entry: ManifestEntry;
  readonly async: {[key: string]: ManifestEntry};
}

export interface AsyncAssetSelector {
  readonly id: string;
  readonly styles: boolean;
  readonly scripts: boolean;
}

export interface AssetSelector<Options> {
  readonly async?: Iterable<string | AsyncAssetSelector>;
  readonly options?: Options;
}

export interface AssetLoader<Options> {
  scripts(selector?: AssetSelector<Options>): Promise<Asset[]>;
  styles(selector?: AssetSelector<Options>): Promise<Asset[]>;
  asyncAssets(
    selectors: NonNullable<AssetSelector<Options>['async']>,
    options?: Pick<AssetSelector<Options>, 'options'>,
  ): Promise<Asset[]>;
}

export interface CreateOptions<Options> {
  getManifest(options: Options): Promise<Manifest>;
}

export function createAssetLoader<Options>({
  getManifest,
}: CreateOptions<Options>): AssetLoader<Options> {
  // Ordering of asset:
  // - vendors (anything other than the first file) for the entry
  // - the actual entry CSS
  // - async assets, reversed so vendors come first
  // - the actual entry JS
  async function getAssets({
    options,
    entry,
    async: asyncAssets = [],
    scripts,
    styles,
  }: AssetSelector<Options> & {
    entry: boolean;
    scripts: boolean;
    styles: boolean;
  }) {
    const manifest = await getManifest(options ?? ({} as any));

    const resolvedEntry = entry ? manifest.entry : undefined;

    // We mark all the entry assets as seen so they are not included
    // by async chunks
    const seen = new Set<string>(
      resolvedEntry
        ? [
            ...resolvedEntry.styles.map(({source}) => source),
            ...resolvedEntry.scripts.map(({source}) => source),
          ]
        : [],
    );
    const assets: Asset[] = [];

    if (asyncAssets) {
      for (const asyncAsset of asyncAssets) {
        const {
          id,
          styles: asyncStyles,
          scripts: asyncScripts,
        } = typeof asyncAsset === 'string'
          ? {id: asyncAsset, styles: true, scripts: true}
          : asyncAsset;

        const resolvedAsyncEntry = manifest.async[id];

        if (resolvedAsyncEntry == null) continue;

        if (styles && asyncStyles) {
          for (const asset of resolvedAsyncEntry.styles.reverse()) {
            if (seen.has(asset.source)) continue;
            seen.add(asset.source);
            assets.push(asset);
          }
        }

        if (scripts && asyncScripts) {
          for (const asset of resolvedAsyncEntry.scripts.reverse()) {
            if (seen.has(asset.source)) continue;
            seen.add(asset.source);
            assets.push(asset);
          }
        }
      }
    }

    if (resolvedEntry) {
      if (scripts) {
        const scripts = [...resolvedEntry.scripts];
        // The last item on the list is the actual entry. It needs to go after
        // any async imports, but the vendors, which are typically shared with
        // dynamic imports, need to go before them.
        const entry = scripts.pop();

        assets.unshift(...scripts);
        assets.push(entry!);
      }

      if (styles) {
        assets.unshift(
          ...resolvedEntry.styles.filter((asset) => !seen.has(asset.source)),
        );
      }
    }

    return assets;
  }

  return {
    scripts: (options = {}) =>
      getAssets({...options, entry: true, styles: false, scripts: true}),
    styles: (options = {}) =>
      getAssets({...options, entry: true, styles: true, scripts: false}),
    asyncAssets: (asyncAssets, options = {}) =>
      getAssets({
        ...options,
        entry: false,
        async: asyncAssets,
        scripts: true,
        styles: true,
      }),
  };
}

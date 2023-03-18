export interface Asset {
  readonly source: string;
  readonly attributes: Record<string, string | boolean | number>;
}

export interface AssetsEntry {
  readonly scripts: Asset[];
  readonly styles: Asset[];
}

export interface AssetBuild {
  readonly id: string;
  readonly default: boolean;
  readonly metadata: Record<string, any>;
  readonly entry: Record<string, AssetsEntry>;
  readonly async: Record<string, AssetsEntry>;
}

export interface AsyncAssetSelector {
  readonly id: string | RegExp;
  readonly styles: boolean;
  readonly scripts: boolean;
}

export interface AssetSelectorOptions<Context> {
  readonly async?: Iterable<AsyncAssetSelector | AsyncAssetSelector['id']>;
  readonly context?: Context;
}

export interface AssetManifest<Context> {
  assets(options?: AssetSelectorOptions<Context>): Promise<AssetsEntry>;
  asyncAssets(
    ids: NonNullable<AssetSelectorOptions<Context>['async']>,
    options?: Pick<AssetSelectorOptions<Context>, 'context'>,
  ): Promise<AssetsEntry>;
}

export interface CreateAssetManifestOptions<Options> {
  getBuild(options: Options): Promise<AssetBuild | undefined>;
}

export function createAssetManifest<Context>({
  getBuild,
}: CreateAssetManifestOptions<Context>): AssetManifest<Context> {
  return {
    assets: (options) => getAssets({...options, entry: true}),
    asyncAssets: (asyncAssets, options = {}) =>
      getAssets({
        ...options,
        entry: false,
        async: asyncAssets,
      }),
  };

  // Ordering of asset:
  // - vendors (anything other than the first file) for the entry
  // - the actual entry CSS
  // - async assets, reversed so vendors come first
  // - the actual entry JS
  async function getAssets({
    entry,
    context,
    async: asyncAssets = [],
  }: AssetSelectorOptions<Context> & {entry: boolean}) {
    const manifest = await getBuild(context ?? ({} as any));

    const resolvedEntry = entry ? manifest?.entry.default : undefined;

    const assets: AssetsEntry = {
      scripts: resolvedEntry ? [...resolvedEntry.scripts] : [],
      styles: resolvedEntry ? [...resolvedEntry.styles] : [],
    };

    // We mark all the entry assets as seen so they are not included
    // by async chunks
    const seen = new Set<string>(
      [...assets.scripts, ...assets.styles].map((asset) => asset.source),
    );

    if (asyncAssets && manifest != null) {
      const dynamicSelectors: (AsyncAssetSelector & {id: RegExp})[] = [];

      const addAsyncAsset = (
        assetsEntry: AssetsEntry,
        {styles, scripts}: AsyncAssetSelector,
      ) => {
        if (styles) {
          for (const asset of assetsEntry.styles) {
            if (seen.has(asset.source)) continue;
            seen.add(asset.source);
            assets.styles.push(asset);
          }
        }

        if (scripts) {
          for (const asset of assetsEntry.scripts) {
            if (seen.has(asset.source)) continue;
            seen.add(asset.source);
            assets.scripts.push(asset);
          }
        }
      };

      for (const asyncAsset of asyncAssets) {
        const selector =
          typeof asyncAsset === 'object' && 'id' in asyncAsset
            ? asyncAsset
            : {id: asyncAsset, styles: true, scripts: true};

        if (typeof selector.id !== 'string') {
          dynamicSelectors.push({...selector, id: selector.id});
          continue;
        }

        const resolvedAsyncEntry = manifest.async[selector.id];

        if (resolvedAsyncEntry) addAsyncAsset(resolvedAsyncEntry, selector);
      }

      if (dynamicSelectors.length > 0) {
        for (const [id, asyncEntry] of Object.entries(manifest.async)) {
          for (const selector of dynamicSelectors) {
            if (selector.id.test(id)) {
              addAsyncAsset(asyncEntry, selector);
            }
          }
        }
      }
    }

    return assets;
  }
}

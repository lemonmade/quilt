export interface Asset {
  readonly path: string;
  readonly integrity?: string;
}

export interface ManifestEntry {
  readonly scripts: Asset[];
  readonly styles: Asset[];
}

export interface MatchRegExp {
  readonly type: 'regex';
  readonly key: string;
  readonly source: string;
}

export type Match = MatchRegExp;

export interface Manifest {
  readonly id: string;
  readonly default: boolean;
  readonly match: Match[];
  readonly entries: {[key: string]: ManifestEntry};
  readonly async: {[key: string]: ManifestEntry};
}

export interface AsyncAssetSelector {
  readonly id: string;
  readonly styles: boolean;
  readonly scripts: boolean;
}

export interface AssetSelector<Options> {
  readonly entry?: string;
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
  async function getAssets({
    options,
    entry,
    async: asyncAssets = [],
    scripts,
    styles,
  }: AssetSelector<Options> & {
    scripts: boolean;
    styles: boolean;
  }) {
    const manifest = await getManifest(options ?? ({} as any));

    const assets: Asset[] = [];
    const resolvedEntry = entry ? manifest.entries[entry] : undefined;

    if (resolvedEntry) {
      if (styles) assets.push(...resolvedEntry.styles);
      if (scripts) assets.push(...resolvedEntry.scripts);
    }

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

        if (resolvedAsyncEntry) {
          const asyncAssets = [
            ...(styles && asyncStyles ? resolvedAsyncEntry.styles : []),
            ...(scripts && asyncScripts ? resolvedAsyncEntry.scripts : []),
          ];

          if (assets.length > 0) {
            assets.splice(assets.length - 1, 0, ...asyncAssets);
          } else {
            assets.push(...asyncAssets);
          }
        }
      }
    }

    return assets;
  }

  return {
    scripts: (options = {}) =>
      getAssets({entry: 'main', ...options, styles: false, scripts: true}),
    styles: ({options} = {}) =>
      getAssets({entry: 'main', ...options, styles: true, scripts: false}),
    asyncAssets: (asyncAssets, options = {}) =>
      getAssets({...options, async: asyncAssets, scripts: true, styles: true}),
  };
}

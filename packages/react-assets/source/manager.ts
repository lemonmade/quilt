import type {
  AssetsCacheKey,
  AssetLoadTiming,
  BrowserAssetModuleSelector,
} from '@quilted/assets';
import type {ServerActionKind} from '@quilted/react-server-render';
import {SERVER_ACTION_ID} from './constants.ts';

const ASSET_TIMING_PRIORITY: AssetLoadTiming[] = ['never', 'preload', 'load'];

const PRIORITY_BY_TIMING = new Map(
  ASSET_TIMING_PRIORITY.map((value, index) => [value, index]),
);

export class AssetsManager<CacheKey = AssetsCacheKey> {
  readonly serverAction: ServerActionKind = {
    id: SERVER_ACTION_ID,
    betweenEachPass: () => {
      this.cacheKeyUpdates = {};
      this.usedModulesWithTiming.clear();
    },
  };

  private usedModulesWithTiming = new Map<
    string,
    {
      styles: AssetLoadTiming;
      scripts: AssetLoadTiming;
    }
  >();
  private cacheKeyUpdates: Partial<CacheKey> = {};
  private readonly initialCacheKey: Partial<CacheKey>;

  constructor({cacheKey}: {cacheKey?: Partial<CacheKey>} = {}) {
    this.initialCacheKey = cacheKey ?? {};
  }

  get cacheKey() {
    return {...this.initialCacheKey, ...this.cacheKeyUpdates};
  }

  updateCacheKey(cacheKey: Partial<CacheKey>) {
    Object.assign(this.cacheKeyUpdates, cacheKey);
  }

  useModule(
    id: string,
    {
      timing = 'load',
      scripts = timing,
      styles = timing,
    }: {
      timing?: AssetLoadTiming;
      scripts?: AssetLoadTiming;
      styles?: AssetLoadTiming;
    } = {},
  ) {
    const current = this.usedModulesWithTiming.get(id);

    if (current == null) {
      this.usedModulesWithTiming.set(id, {
        scripts,
        styles,
      });
    } else {
      this.usedModulesWithTiming.set(id, {
        scripts:
          scripts == null
            ? current.scripts
            : highestPriorityAssetLoadTiming(scripts, current.scripts),
        styles:
          styles == null
            ? current.styles
            : highestPriorityAssetLoadTiming(styles, current.styles),
      });
    }
  }

  usedModules({
    timing = 'load',
  }: {timing?: AssetLoadTiming | AssetLoadTiming[]} = {}) {
    const allowedTiming = Array.isArray(timing) ? timing : [timing];

    const assets: BrowserAssetModuleSelector[] = [];

    for (const [asset, {scripts, styles}] of this.usedModulesWithTiming) {
      const stylesMatch = allowedTiming.includes(styles);
      const scriptsMatch = allowedTiming.includes(scripts);

      if (stylesMatch || scriptsMatch) {
        assets.push({id: asset, styles: stylesMatch, scripts: scriptsMatch});
      }
    }

    return assets;
  }
}

function highestPriorityAssetLoadTiming(...timings: AssetLoadTiming[]) {
  return ASSET_TIMING_PRIORITY[
    Math.max(...timings.map((timing) => PRIORITY_BY_TIMING.get(timing)!))
  ]!;
}

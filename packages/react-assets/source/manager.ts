import type {AssetsCacheKey} from '@quilted/assets';
import type {ServerActionKind} from '@quilted/react-server-render';
import {SERVER_ACTION_ID} from './constants';

export class AssetsManager<CacheKey = AssetsCacheKey> {
  readonly serverAction: ServerActionKind = {
    id: SERVER_ACTION_ID,
    betweenEachPass: () => {
      this.cacheKeyUpdates = {};
    },
  };

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
}

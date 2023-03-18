import type {AssetsCacheKey} from '@quilted/assets';
import type {ServerActionKind} from '@quilted/react-server-render';
import {SERVER_ACTION_ID} from './constants';

export class AssetsManager<CacheKey = AssetsCacheKey> {
  readonly serverAction: ServerActionKind = {
    id: SERVER_ACTION_ID,
    betweenEachPass: () => {
      this.updates = {};
    },
  };

  private updates: Partial<CacheKey> = {};

  constructor(readonly initial: Partial<CacheKey> = {}) {}

  get cacheKey() {
    return {...this.initial, ...this.updates};
  }

  update(cacheKey: Partial<CacheKey>) {
    Object.assign(this.updates, cacheKey);
  }
}

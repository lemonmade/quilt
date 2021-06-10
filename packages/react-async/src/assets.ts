import type {ServerActionKind} from '@quilted/react-server-render';

import type {AssetLoadTiming} from './types';

export interface AssetSelector {
  id: string;
  styles: boolean;
  scripts: boolean;
}

interface AssetOptions {
  styles: AssetLoadTiming;
  scripts: AssetLoadTiming;
}

export const SERVER_ACTION_ID = Symbol('react-async');

const ASSET_TIMING_PRIORITY: AssetLoadTiming[] = ['never', 'preload', 'load'];

const PRIORITY_BY_TIMING = new Map(
  ASSET_TIMING_PRIORITY.map((value, index) => [value, index]),
);

export class AsyncAssetManager {
  readonly serverAction: ServerActionKind = {
    id: SERVER_ACTION_ID,
    betweenEachPass: () => {
      this.assets.clear();
    },
  };

  private assets = new Map<string, AssetOptions>();

  used({timing = 'load'}: {timing?: AssetLoadTiming | AssetLoadTiming[]} = {}) {
    const timingArray = Array.isArray(timing) ? timing : [timing];

    const assets: AssetSelector[] = [];

    for (const [asset, {scripts, styles}] of this.assets) {
      const scriptsMatch = timingArray.includes(scripts);
      const stylesMatch = timingArray.includes(styles);

      if (stylesMatch || scriptsMatch) {
        assets.push({id: asset, scripts: scriptsMatch, styles: stylesMatch});
      }
    }

    return assets;
  }

  markAsUsed(
    id: string,
    timing:
      | AssetLoadTiming
      | {scripts?: AssetLoadTiming; styles?: AssetLoadTiming} = 'load',
  ) {
    const current = this.assets.get(id);
    const scripts = typeof timing === 'object' ? timing.scripts : timing;
    const styles = typeof timing === 'object' ? timing.styles : timing;

    if (current == null) {
      this.assets.set(id, {
        scripts: scripts ?? 'load',
        styles: styles ?? 'load',
      });
    } else {
      this.assets.set(id, {
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
}

function highestPriorityAssetLoadTiming(...timings: AssetLoadTiming[]) {
  return ASSET_TIMING_PRIORITY[
    Math.max(...timings.map((timing) => PRIORITY_BY_TIMING.get(timing)!))
  ];
}

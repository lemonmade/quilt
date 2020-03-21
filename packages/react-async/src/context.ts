import React from 'react';
import {ServerRenderEffectKind} from '@quilted/react-server-render';

import {AssetTiming} from './types';

export interface AssetSelector {
  id: string;
  styles: boolean;
  scripts: boolean;
}

interface AssetOptions {
  styles: AssetTiming;
  scripts: AssetTiming;
}

export const EFFECT_ID = Symbol('react-async');

const ASSET_TIMING_PRIORITY: AssetTiming[] = [
  'immediate',
  'soon',
  'eventually',
  'never',
];

const PRIORITY_BY_TIMING = new Map(
  ASSET_TIMING_PRIORITY.map((value, index) => [value, index]),
);

export class AsyncAssetManager {
  readonly effect: ServerRenderEffectKind = {
    id: EFFECT_ID,
    betweenEachPass: () => {
      this.assets.clear();
    },
  };

  private assets = new Map<string, AssetOptions>();

  used(timing: AssetTiming | AssetTiming[] = 'immediate') {
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
      | AssetTiming
      | {scripts?: AssetTiming; styles?: AssetTiming} = 'immediate',
  ) {
    const current = this.assets.get(id);
    const scripts = typeof timing === 'object' ? timing.scripts : timing;
    const styles = typeof timing === 'object' ? timing.styles : timing;

    if (current == null) {
      this.assets.set(id, {
        scripts: scripts ?? 'immediate',
        styles: styles ?? 'immediate',
      });
    } else {
      this.assets.set(id, {
        scripts:
          scripts == null
            ? current.scripts
            : highestPriorityAssetTiming(scripts, current.scripts),
        styles:
          styles == null
            ? current.styles
            : highestPriorityAssetTiming(styles, current.styles),
      });
    }
  }
}

function highestPriorityAssetTiming(...timings: AssetTiming[]) {
  return ASSET_TIMING_PRIORITY[
    Math.max(...timings.map((timing) => PRIORITY_BY_TIMING.get(timing)!))
  ];
}

export const AsyncAssetContext = React.createContext<AsyncAssetManager | null>(
  null,
);

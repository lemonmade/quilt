export type AssetBuildAssetType = /** style */ 1 | /** script */ 2;

/**
 * A compact tuple describing the assets for one module entry.
 * Stored in the manifest as an object with numeric string keys,
 * omitting any positions that are empty/undefined.
 *
 * Positions:
 *   [0] script              — asset index of the entry JS chunk
 *   [1] style               — asset index of the entry CSS file
 *   [2] scriptSync          — asset indices of sync JS dependencies
 *   [3] styleSync           — asset indices of CSS from sync JS dependencies
 *   [4] scriptAsync         — asset indices of dynamic JS dependencies
 *   [5] styleAsync          — asset indices of CSS from dynamic JS dependencies
 */
export type AssetBuildModuleEntry = [
  script?: number,
  style?: number,
  scriptSync?: number[],
  styleSync?: number[],
  scriptAsync?: number[],
  styleAsync?: number[],
];

export interface AssetBuildManifest {
  key?: string;
  priority?: number;
  base?: string;
  attributes?: {
    [K in AssetBuildAssetType]?: Record<string, string | boolean | number>;
  };
  entries: {
    '.': string;
    [key: string]: string;
  };
  modules: Record<string, AssetBuildModuleEntry>;
  assets: AssetBuildAsset[];
}

export type AssetBuildAsset = [
  type: AssetBuildAssetType,
  path: string,
  integrityOrIntegrity?: string,
  attributes?: {textContent: string; [key: string]: string | boolean | number},
];

import type {AssetManifest} from '@quilted/async/server';

declare function createAssetManifest(): AssetManifest<{userAgent?: string}>;

export default createAssetManifest;

import './assets/files.ts';
import './assets/styles.ts';

export * from '@quilted/assets';

declare module '@quilted/assets' {
  interface AssetsCacheKey {
    browserGroup?: string;
  }
}

declare module 'quilt:module/app' {
  import type {ComponentType} from 'react';

  const App: ComponentType<Record<string, unknown>>;
  export default App;
}

declare module 'quilt:module/request-router' {
  import type {RequestRouter} from '@quilted/request-router';

  const router: RequestRouter;
  export default router;
}

declare module 'quilt:module/assets' {
  import type {
    AssetsCacheKey,
    BrowserAssets as BrowserAssetsType,
  } from '@quilted/assets';

  export const BrowserAssets: {
    new <CacheKey = AssetsCacheKey>(): BrowserAssetsType<CacheKey>;
  };
}
